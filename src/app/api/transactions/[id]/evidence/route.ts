import { type NextRequest } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { computeSha256 } from '@/lib/utils/document-forensics';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const tx = await findTransactionByIdOrNumber(id);

    if (!tx) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!canAccessTransaction(user, tx)) {
      return Response.json({ error: 'Not authorized for this transaction' }, { status: 403 });
    }

    const txUuid = tx.id;

    const contentType = request.headers.get('content-type') || '';
    let fileName = 'inspection_report.txt';
    let fileType = 'text/plain';
    let buffer: Buffer;
    let evidenceCategory = 'SURVEYOR_REPORT';
    let title = 'Inspection / Damage Evidence';
    let description = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const files = formData.getAll('files') as File[];
      const targetFile = file || files[0];

      if (!targetFile) {
        return Response.json({ error: 'No evidence file provided in form data' }, { status: 400 });
      }

      fileName = path.basename(targetFile.name).replace(/[^a-zA-Z0-9._-]/g, '_');
      fileType = targetFile.type || 'application/octet-stream';
      buffer = Buffer.from(await targetFile.arrayBuffer());
      evidenceCategory = (formData.get('evidenceCategory') as string) || 'DAMAGE_PHOTO';
      title = (formData.get('title') as string) || fileName;
      description = (formData.get('description') as string) || '';
    } else {
      const body = await request.json().catch(() => ({}));
      evidenceCategory = body.evidenceCategory || 'SURVEYOR_REPORT';
      title = body.title || 'Damage & Discrepancy Evidence';
      description = body.description || body.notes || '';
      fileName = body.fileName || `dispute_evidence_${Date.now()}.txt`;
      fileType = 'text/plain';
      const textContent = body.content || `DISPUTE EVIDENCE\nTitle: ${title}\nCategory: ${evidenceCategory}\nDescription: ${description}\nSubmitted By: ${user.email}\nDate: ${new Date().toISOString()}`;
      buffer = Buffer.from(textContent, 'utf-8');
    }

    const sha256Digest = computeSha256(buffer);

    // Save file on disk
    const txDir = path.join(UPLOAD_ROOT, txUuid, 'disputes');
    await mkdir(txDir, { recursive: true });
    const storedPath = path.join(txDir, `${Date.now()}_${fileName}`);
    await writeFile(storedPath, buffer);

    // Insert into documents table
    const [doc] = await db
      .insert(schema.documents)
      .values({
        transactionId: txUuid,
        fileName,
        fileType,
        filePath: storedPath,
        fileSize: buffer.length,
        documentType: 'dispute_evidence',
        sha256: sha256Digest,
        forensicMetadata: {
          evidenceCategory,
          title,
          description,
          submittedBy: user.email,
          digestAlgorithm: 'SHA-256',
        },
      })
      .returning();

    // Find active dispute if any
    const [activeDispute] = await db
      .select()
      .from(schema.disputes)
      .where(and(eq(schema.disputes.transactionId, txUuid), eq(schema.disputes.status, 'OPEN')))
      .orderBy(desc(schema.disputes.createdAt))
      .limit(1);

    if (activeDispute) {
      await db
        .update(schema.disputes)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(schema.disputes.id, activeDispute.id));
    }

    // Insert audit log
    await db.insert(schema.auditLogs).values({
      transactionId: txUuid,
      userId: user.id,
      actor: user.email,
      event: 'DISPUTE_EVIDENCE_SUBMITTED',
      action: 'SUBMIT_EVIDENCE',
      result: 'SUCCESS',
      metadata: {
        documentId: doc.id,
        fileName,
        evidenceCategory,
        sha256: sha256Digest,
        disputeId: activeDispute?.id || null,
      },
    });

    return Response.json({
      success: true,
      document: doc,
      sha256: sha256Digest,
      evidenceCategory,
      disputeId: activeDispute?.id || null,
      message: 'Damage and inspection evidence securely catalogued with cryptographic SHA-256 digest.',
    }, { status: 201 });
  } catch (err: unknown) {
    console.error('Evidence POST error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to submit evidence';
    return Response.json({ error: msg }, { status: 500 });
  }
}
