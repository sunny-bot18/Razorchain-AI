import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { dispatchWebhook } from '@/lib/services/webhook-service';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

const disputeSchema = z.object({
  category: z.enum(['DAMAGED_GOODS', 'SHORTAGE', 'SPECIFICATION_MISMATCH', 'DELAY', 'OTHER']),
  reason: z.string().trim().min(5).max(1000),
  claimAmount: z.number().positive().optional(),
  description: z.string().trim().max(2000).optional(),
});

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
      return Response.json({ error: 'Not authorized to dispute this transaction' }, { status: 403 });
    }

    if (['SETTLED', 'CANCELLED', 'REFUNDED'].includes(tx.status)) {
      return Response.json({
        error: `Cannot dispute a transaction in status ${tx.status}`,
      }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = disputeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid dispute payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { category, reason, claimAmount, description } = parsed.data;
    const now = new Date();
    const txUuid = tx.id;

    // 1. Halt SLA auto-release timers and preserve previous deadline
    const previousAutoReleaseAt = tx.autoReleaseAt;

    // 2. Insert into disputes table
    const [dispute] = await db
      .insert(schema.disputes)
      .values({
        transactionId: txUuid,
        raisedById: user.id,
        category,
        reason,
        claimAmount: claimAmount || tx.amount,
        status: 'OPEN',
        haltedAutoReleaseAt: previousAutoReleaseAt,
        resolution: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 3. Update transaction status to DISPUTED & clear autoReleaseAt (halt timers)
    await db
      .update(schema.transactions)
      .set({
        status: 'DISPUTED',
        autoReleaseAt: null,
        sellerProofDeadline: null,
        disputeDetails: {
          disputeId: dispute.id,
          category,
          reason,
          claimAmount: claimAmount || tx.amount,
          description,
          raisedBy: user.email,
          raisedAt: now.toISOString(),
          haltedAutoReleaseAt: previousAutoReleaseAt?.toISOString() || null,
        },
        updatedAt: now,
      })
      .where(eq(schema.transactions.id, txUuid));

    // 4. Record audit log
    await db.insert(schema.auditLogs).values({
      transactionId: txUuid,
      userId: user.id,
      actor: user.email,
      event: 'DISPUTE_RAISED',
      action: 'HALT_SLA_TIMERS_AND_DISPUTE',
      result: 'SUCCESS',
      metadata: {
        disputeId: dispute.id,
        category,
        reason,
        claimAmount: claimAmount || tx.amount,
        haltedAutoReleaseAt: previousAutoReleaseAt?.toISOString() || null,
      },
    });

    // 5. Fire webhook notification
    try {
      await dispatchWebhook(
        txUuid,
        'MANUAL_REVIEW_TRIGGERED',
        {
          event: 'DISPUTE_RAISED',
          disputeId: dispute.id,
          category,
          reason,
          claimAmount: claimAmount || tx.amount,
        },
        [tx.buyerId, tx.sellerId],
      );
    } catch (e) {
      console.warn('[Dispute] Webhook dispatch failed:', e);
    }

    return Response.json({
      success: true,
      dispute,
      message: `Dispute filed under category ${category}. Escrow SLA auto-release timers halted.`,
      transactionStatus: 'DISPUTED',
      timersHalted: true,
    }, { status: 201 });
  } catch (err: unknown) {
    console.error('Dispute POST error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to raise dispute';
    return Response.json({ error: msg }, { status: 500 });
  }
}
