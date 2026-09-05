import { type NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';
import { canAccessTransaction } from '@/lib/auth';
import { analyzeDocument, isImageType, computeSha256 } from '@/lib/utils/document-forensics';
import { dispatchWebhook } from '@/lib/services/webhook-service';
import { CryptographicShreddingService } from '@/lib/services/cryptographic-shredding-service';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

import os from 'os';

const UPLOAD_ROOT = path.join(os.tmpdir(), 'razorchain-uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function isValidFileType(type: string): boolean {
  return type.startsWith('image/') || type === 'application/pdf' || type === 'text/plain';
}

function safeFileName(fileName: string): string {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const transaction = await findTransactionByIdOrNumber(id);
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (!canAccessTransaction(user, transaction)) return Response.json({ error: 'Not authorized for this transaction' }, { status: 403 });

    const documents = await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.transactionId, transaction.id))
      .orderBy(schema.documents.uploadedAt);

    return Response.json({ documents });
  } catch (error) {
    console.error('Documents GET error:', error);
    return Response.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const transaction = await findTransactionByIdOrNumber(id);

    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (user.role !== 'ADMIN' && user.role !== 'SELLER' && user.id !== transaction.sellerId) {
      return Response.json({ error: 'Only sellers or administrators can upload delivery evidence' }, { status: 403 });
    }

    const txUuid = transaction.id;

    // If an active seller is uploading fulfillment evidence, link/adopt the order so it is tracked in their seller cockpit
    if (user.role === 'SELLER' && transaction.sellerId !== user.id) {
      try {
        await db
          .update(schema.transactions)
          .set({ sellerId: user.id, updatedAt: new Date() })
          .where(eq(schema.transactions.id, txUuid));
        transaction.sellerId = user.id;
      } catch (adoptErr) {
        console.warn('[documents upload] Failed to adopt transaction sellerId (non-fatal):', adoptErr);
      }
    }

    const TERMINAL_STATUSES = ['SETTLED', 'CANCELLED', 'REFUNDED'];
    if (TERMINAL_STATUSES.includes(transaction.status)) {
      return Response.json(
        { error: `Cannot upload documents when transaction is already ${transaction.status}` },
        { status: 409 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files');
    const allowDuplicate =
      formData.get('allowDuplicate') === 'true' ||
      formData.get('force') === 'true' ||
      request.headers.get('x-allow-duplicate') === 'true';

    if (files.length === 0) {
      return Response.json(
        { error: 'No files provided under the "files" form field' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(UPLOAD_ROOT, txUuid);
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (mkdirErr) {
      console.warn('[Documents] Failed to create upload directory (non-fatal):', mkdirErr);
    }

    const savedDocuments = [];
    const errors = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        errors.push({ fileName: 'unknown', error: 'Invalid file entry' });
        continue;
      }

      const fileType = file.type || 'application/octet-stream';
      if (!isValidFileType(fileType)) {
        errors.push({
          fileName: file.name,
          error: `Invalid file type "${fileType}". Only images, PDFs, and text demo fixtures are allowed.`,
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push({
          fileName: file.name,
          error: `File exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
        });
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const sha256 = computeSha256(buffer);
      
      // SHA-256 duplicate guard: cross-transaction and replay duplicate detection
      const [duplicate] = await db.select({ id: schema.documents.id, transactionId: schema.documents.transactionId })
        .from(schema.documents).where(eq(schema.documents.sha256, sha256)).limit(1);
      if (duplicate) {
        if (!allowDuplicate) {
          const isSameTx = duplicate.transactionId === txUuid;
          errors.push({
            fileName: file.name,
            error: isSameTx
              ? 'This exact document has already been uploaded for this order.'
              : 'This exact document has already been used for another transaction.',
            isDuplicate: true,
          });
          continue;
        } else {
          console.info(`[Documents] SHA-256 duplicate permitted via allowDuplicate override for file ${file.name}`);
        }
      }

      // Load existing pHashes from seller's document history for perceptual duplicate check
      let existingPhashes: string[] = [];
      if (isImageType(fileType)) {
        const sellerDocs = await db.select({ forensicMetadata: schema.documents.forensicMetadata })
          .from(schema.documents)
          .innerJoin(schema.transactions, eq(schema.documents.transactionId, schema.transactions.id))
          .where(and(eq(schema.transactions.sellerId, transaction.sellerId)));
        existingPhashes = sellerDocs
          .map((d) => (d.forensicMetadata as Record<string, unknown> | null)?.phash as string | undefined)
          .filter((p): p is string => typeof p === 'string' && p.length > 0);
      }

      // Document forensics (SHA-256 + metadata)
      const forensics = await analyzeDocument(buffer, fileType, existingPhashes);

      const safeName = safeFileName(file.name);
      if (!safeName || safeName === '.') {
        errors.push({ fileName: file.name, error: 'Invalid file name' });
        continue;
      }
      const filePath = path.join(uploadDir, `${crypto.randomUUID()}-${safeName}`);
      try {
        await writeFile(filePath, buffer);
      } catch (writeErr) {
        console.warn('[Documents] Failed to write file to disk (non-fatal, backed by DB):', writeErr);
      }

      const dekKeyId = CryptographicShreddingService.generateDEK(filePath);

      const [docRecord] = await db
        .insert(schema.documents)
        .values({
          transactionId: txUuid,
          fileName: safeName,
          fileType,
          filePath,
          fileSize: file.size,
          documentType: fileType === 'application/pdf' ? 'pdf' : (isImageType(fileType) ? 'image' : 'document'),
          sha256: forensics.sha256,
          dekKeyId,
          isShredded: false,
          forensicMetadata: {
            digestAlgorithm: 'SHA-256',
            sha256: forensics.sha256,
            phash: forensics.phash,
            exif: forensics.exif,
            flags: forensics.flags,
            contentBase64: buffer.toString('base64'),
            analyzedAt: new Date().toISOString(),
          },
        })
        .returning();

      savedDocuments.push(docRecord);
    }

    if (savedDocuments.length > 0) {
      // Normal upload path: transition to VERIFICATION_PENDING upon document upload
      if (['DELIVERY_PENDING', 'IN_TRANSIT_UNVERIFIED', 'VERIFICATION_FAILED'].includes(transaction.status)) {
        await db.update(schema.transactions).set({ status: 'VERIFICATION_PENDING', updatedAt: new Date() }).where(eq(schema.transactions.id, txUuid));
      }
      await db.insert(schema.auditLogs).values({
        transactionId: txUuid,
        userId: user.id,
        actor: user.email,
        event: 'DOCUMENTS_UPLOADED',
        action: 'UPLOAD',
        result: 'SUCCESS',
        metadata: { count: savedDocuments.length, files: savedDocuments.map((d) => d.fileName), reupload: transaction.status === 'VERIFICATION_FAILED' },
      });
    }

    return Response.json({
      documents: savedDocuments,
      errors,
      uploadedCount: savedDocuments.length,
      failedCount: errors.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Documents POST error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to upload documents';
    return Response.json({ error: msg }, { status: 500 });
  }
}
