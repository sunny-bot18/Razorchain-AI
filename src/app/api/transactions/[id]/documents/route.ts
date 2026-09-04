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

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
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
    if (user.role !== 'ADMIN' && user.id !== transaction.sellerId) {
      return Response.json({ error: 'Only the assigned seller can upload evidence' }, { status: 403 });
    }

    const txUuid = transaction.id;

    if (!['DELIVERY_PENDING', 'VERIFICATION_FAILED'].includes(transaction.status)) {
      return Response.json(
        { error: `Cannot upload documents when transaction is ${transaction.status}` },
        { status: 409 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files');

    if (files.length === 0) {
      return Response.json(
        { error: 'No files provided under the "files" form field' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(UPLOAD_ROOT, txUuid);
    await mkdir(uploadDir, { recursive: true });

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
      
      // SHA-256 duplicate guard: cross-transaction duplicate detection
      const [duplicate] = await db.select({ id: schema.documents.id, transactionId: schema.documents.transactionId })
        .from(schema.documents).where(eq(schema.documents.sha256, sha256)).limit(1);
      if (duplicate && duplicate.transactionId !== txUuid) {
        errors.push({ fileName: file.name, error: 'This exact document has already been used for another transaction.' });
        continue;
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

      // Run full forensic analysis (SHA-256 + pHash + EXIF)
      const forensics = await analyzeDocument(buffer, fileType, existingPhashes);

      // Flag perceptual duplicates (preserved in DB for fraud interception & audit trail)
      if (forensics.flags.includes('PERCEPTUAL_DUPLICATE_DETECTED')) {
        errors.push({ fileName: file.name, error: 'This document appears to be a visual duplicate of a document used in a previous transaction.' });
      }

      const safeName = safeFileName(file.name);
      if (!safeName || safeName === '.') {
        errors.push({ fileName: file.name, error: 'Invalid file name' });
        continue;
      }
      const filePath = path.join(uploadDir, `${crypto.randomUUID()}-${safeName}`);
      await writeFile(filePath, buffer);

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
            analyzedAt: new Date().toISOString(),
          },
        })
        .returning();

      savedDocuments.push(docRecord);
    }

    if (savedDocuments.length > 0) {
      // Aegis Deepfake / Fraud Interception: check if any uploaded doc has critical tampering flags
      const severeFraudFlags = savedDocuments.flatMap((d) => {
        const flags = ((d.forensicMetadata as any)?.flags as string[]) || [];
        return flags.filter((f) => ['POTENTIAL_INPAINTING', 'AI_GENERATED', 'METADATA_TIMESTAMP_TAMPERED'].includes(f));
      });

      if (severeFraudFlags.length > 0) {
        // 1. Intercept pipeline: shift immediately to MANUAL_REVIEW
        // 2. Halt all Escrow SLA "Deadman's Switch" timers (autoReleaseAt = null)
        await db
          .update(schema.transactions)
          .set({
            status: 'MANUAL_REVIEW',
            autoReleaseAt: null, // Freeze timers
            updatedAt: new Date(),
          })
          .where(eq(schema.transactions.id, txUuid));

        // 3. Permanently anchor deepfake SHA-256 and forensic proof into immutable audit trail
        await db.insert(schema.auditLogs).values({
          transactionId: txUuid,
          userId: user.id,
          actor: 'aegis:forensic-firewall',
          event: 'FORENSIC_FRAUD_INTERCEPTED',
          action: 'INTERCEPT_DOCUMENT_UPLOAD',
          result: 'BLOCKED',
          metadata: {
            reason: 'Synthetic, inpainting, or tampered delivery document intercepted during upload',
            flags: severeFraudFlags,
            interceptedDocuments: savedDocuments.map((d) => ({
              id: d.id,
              fileName: d.fileName,
              sha256: d.sha256,
              flags: (d.forensicMetadata as any)?.flags,
            })),
            timersFrozen: true,
            statusTransition: 'MANUAL_REVIEW',
            detectedAt: new Date().toISOString(),
          },
        });

        // 4. Alert Buyer & Admin via outbound webhook
        try {
          void dispatchWebhook(txUuid, 'MANUAL_REVIEW_TRIGGERED', {
            alert: 'FORENSIC_FRAUD_INTERCEPTED',
            flags: severeFraudFlags,
            status: 'MANUAL_REVIEW',
            timersFrozen: true,
            message: 'A fraudulent or synthetic document was intercepted by the Aegis Forensic Firewall.',
          }, [transaction.buyerId, transaction.sellerId]);
        } catch (wErr) {
          console.warn('[Documents] Fraud alert webhook failed (non-fatal):', wErr);
        }
      } else {
        // Normal upload path
        if (transaction.status === 'DELIVERY_PENDING' || transaction.status === 'VERIFICATION_FAILED') {
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
    }

    return Response.json({
      documents: savedDocuments,
      errors,
      uploadedCount: savedDocuments.length,
      failedCount: errors.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Documents POST error:', error);
    return Response.json({ error: 'Failed to upload documents' }, { status: 500 });
  }
}
