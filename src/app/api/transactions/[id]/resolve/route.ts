import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

const resolutionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().min(1).max(2_000),
});

/** Records a human override for a manual-review or failed AI decision. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'ADMIN') return Response.json({ error: 'Only administrators can resolve manual reviews' }, { status: 403 });
    const body = resolutionSchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) return Response.json({ error: 'A decision and a non-empty reason are required' }, { status: 400 });
    const { id } = await params;
    const transaction = await findTransactionByIdOrNumber(id);
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (!['MANUAL_REVIEW', 'VERIFICATION_FAILED', 'DISPUTED'].includes(transaction.status)) {
      return Response.json({ error: `Admin resolution is not available while transaction is ${transaction.status}` }, { status: 409 });
    }

    const txUuid = transaction.id;

    const [reservation] = await db
      .select()
      .from(schema.paymentReservations)
      .where(eq(schema.paymentReservations.transactionId, txUuid))
      .limit(1);

    let nextStatus: (typeof schema.transactionStatusEnum.enumValues)[number];
    if (body.data.decision === 'APPROVED') {
      nextStatus = 'VERIFIED';
    } else {
      // Rejection of evidence or upholding dispute voids seller's claim and initiates refund to buyer
      nextStatus = reservation ? 'REFUNDED' : 'CANCELLED';
      if (reservation) {
        await db
          .update(schema.paymentReservations)
          .set({ status: 'refund_requested', updatedAt: new Date() })
          .where(eq(schema.paymentReservations.transactionId, txUuid));
      }
    }

    await db.update(schema.transactions).set({ status: nextStatus, updatedAt: new Date() }).where(eq(schema.transactions.id, txUuid));
    await db.update(schema.verificationResults).set({
      status: body.data.decision,
      confidence: body.data.decision === 'APPROVED' ? 1.0 : 0.0,
      failedChecks: body.data.decision === 'APPROVED' ? [] : ['admin_override_rejected'],
      reason: `${body.data.reason} (human override by ${user.email})`,
      updatedAt: new Date(),
    }).where(eq(schema.verificationResults.transactionId, txUuid));

    if (body.data.decision === 'APPROVED') {
      const [existingSc] = await db
        .select()
        .from(schema.securityChecks)
        .where(eq(schema.securityChecks.transactionId, txUuid))
        .limit(1);

      if (existingSc) {
        await db
          .update(schema.securityChecks)
          .set({
            status: 'SAFE',
            riskScore: 0.05,
            flags: [],
            details: {
              ...(typeof existingSc.details === 'object' && existingSc.details ? existingSc.details : {}),
              adminOverride: true,
              overriddenBy: user.email,
              overriddenAt: new Date().toISOString(),
              reason: body.data.reason,
            },
          })
          .where(eq(schema.securityChecks.transactionId, txUuid));
      } else {
        await db.insert(schema.securityChecks).values({
          transactionId: txUuid,
          riskScore: 0.05,
          status: 'SAFE',
          flags: [],
          details: {
            adminOverride: true,
            overriddenBy: user.email,
            overriddenAt: new Date().toISOString(),
            reason: body.data.reason,
          },
        });
      }
    }

    await db.insert(schema.auditLogs).values({
      transactionId: txUuid,
      userId: user.id,
      actor: user.email,
      event: nextStatus === 'REFUNDED' ? 'REFUND_REQUESTED' : 'MANUAL_REVIEW_RESOLVED',
      action: body.data.decision === 'APPROVED' ? 'RESOLVE' : 'REFUND',
      result: 'SUCCESS',
      metadata: {
        from: transaction.status,
        to: nextStatus,
        decision: body.data.decision,
        reason: body.data.reason,
        securityOverride: body.data.decision === 'APPROVED',
      },
    });
    return Response.json({ status: nextStatus, decision: body.data.decision });
  } catch (error) {
    console.error('Resolve POST error:', error);
    return Response.json({ error: 'Failed to resolve manual review' }, { status: 500 });
  }
}
