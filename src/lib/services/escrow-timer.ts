import { lt, and, isNotNull, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { PaymentService } from '@/lib/services/payment-service';
import { dispatchWebhook } from '@/lib/services/webhook-service';

export interface TimerFireResult {
  autoReleased: number;
  autoRefunded: number;
  errors: string[];
}

/**
 * Auto-release: if auto_release_at has passed and transaction is VERIFIED/MANUAL_REVIEW
 * (buyer took no action), release funds to seller.
 */
async function fireAutoReleases(): Promise<{ count: number; errors: string[] }> {
  const now = new Date();
  const errors: string[] = [];
  let count = 0;

  try {
    // Find transactions due for auto-release
    const due = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          isNotNull(schema.transactions.autoReleaseAt),
          lt(schema.transactions.autoReleaseAt, now),
          or(
            eq(schema.transactions.status, 'VERIFIED'),
            eq(schema.transactions.status, 'MANUAL_REVIEW'),
          ),
        ),
      );

    for (const tx of due) {
      try {
        const [reservation] = await db.select().from(schema.paymentReservations)
          .where(eq(schema.paymentReservations.transactionId, tx.id)).limit(1);
        const [existingExecution] = await db.select({ id: schema.paymentExecutions.id })
          .from(schema.paymentExecutions).where(eq(schema.paymentExecutions.transactionId, tx.id)).limit(1);
        if (!reservation || reservation.status !== 'authorized' || existingExecution) {
          errors.push(`TX ${tx.id}: cannot auto-release without one authorized, unexecuted reservation`);
          continue;
        }
        const paymentService = new PaymentService();
        const idempotencyKey = `auto-release-${tx.id}-${tx.autoReleaseAt?.getTime() ?? Date.now()}`;
        const capture = await paymentService.capturePayment(reservation.razorpayPaymentId || 'mock_payment', tx.amount, idempotencyKey);
        await db.insert(schema.paymentExecutions).values({ transactionId: tx.id, idempotencyKey, action: 'CAPTURE', amount: tx.amount, status: capture.status, razorpayResponse: capture as unknown as Record<string, unknown>, executedAt: new Date() });
        await db
          .update(schema.transactions)
          .set({ status: 'SETTLED', updatedAt: new Date() })
          .where(eq(schema.transactions.id, tx.id));

        await db.insert(schema.auditLogs).values({
          transactionId: tx.id,
          actor: 'system:escrow-timer',
          event: 'ESCROW_AUTO_RELEASED',
          action: 'AUTO_RELEASE',
          result: 'SUCCESS',
          metadata: {
            reason: 'Buyer did not act within inspection window',
            autoReleaseAt: tx.autoReleaseAt,
            triggeredAt: now.toISOString(),
            paymentId: capture.id,
          },
        });
        void dispatchWebhook(tx.id, 'AUTO_RELEASED', { status: 'SETTLED', amount: tx.amount, paymentId: capture.id }, [tx.buyerId, tx.sellerId]);
        count++;
      } catch (err) {
        errors.push(`TX ${tx.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Also fire auto-release on individual milestones
    const dueMilestones = await db
      .select()
      .from(schema.paymentMilestones)
      .where(
        and(
          isNotNull(schema.paymentMilestones.autoReleaseAt),
          lt(schema.paymentMilestones.autoReleaseAt, now),
          or(
            eq(schema.paymentMilestones.status, 'APPROVED'),
            eq(schema.paymentMilestones.status, 'VERIFYING'),
          ),
        ),
      );

    for (const ms of dueMilestones) {
      try {
        await db
          .update(schema.paymentMilestones)
          .set({ status: 'SETTLED', settledAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.paymentMilestones.id, ms.id));

        await db.insert(schema.auditLogs).values({
          transactionId: ms.transactionId,
          actor: 'system:escrow-timer',
          event: 'MILESTONE_AUTO_RELEASED',
          action: 'AUTO_RELEASE',
          result: 'SUCCESS',
          metadata: { milestoneId: ms.id, label: ms.label, amount: ms.amount },
        });
        const [tx] = await db.select({ buyerId: schema.transactions.buyerId, sellerId: schema.transactions.sellerId }).from(schema.transactions).where(eq(schema.transactions.id, ms.transactionId)).limit(1);
        if (tx) void dispatchWebhook(ms.transactionId, 'MILESTONE_SETTLED', { milestoneId: ms.id, label: ms.label, amount: ms.amount, autoReleased: true }, [tx.buyerId, tx.sellerId]);
        count++;
      } catch (err) {
        errors.push(`Milestone ${ms.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`Auto-release scan failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { count, errors };
}

/**
 * Auto-refund: if seller_proof_deadline has passed and transaction is still
 * DELIVERY_PENDING (no docs uploaded), refund buyer.
 */
async function fireAutoRefunds(): Promise<{ count: number; errors: string[] }> {
  const now = new Date();
  const errors: string[] = [];
  let count = 0;

  try {
    const due = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          isNotNull(schema.transactions.sellerProofDeadline),
          lt(schema.transactions.sellerProofDeadline, now),
          eq(schema.transactions.status, 'DELIVERY_PENDING'),
        ),
      );

    for (const tx of due) {
      try {
        // Check no documents were uploaded
        const [doc] = await db
          .select({ id: schema.documents.id })
          .from(schema.documents)
          .where(eq(schema.documents.transactionId, tx.id))
          .limit(1);

        if (doc) continue; // seller did upload, skip

        await db
          .update(schema.transactions)
          .set({ status: 'REFUNDED', updatedAt: new Date() })
          .where(eq(schema.transactions.id, tx.id));

        await db.insert(schema.auditLogs).values({
          transactionId: tx.id,
          actor: 'system:escrow-timer',
          event: 'ESCROW_AUTO_REFUNDED',
          action: 'AUTO_REFUND',
          result: 'SUCCESS',
          metadata: {
            reason: 'Seller failed to upload delivery proof before deadline',
            deadline: tx.sellerProofDeadline,
            triggeredAt: now.toISOString(),
          },
        });
        void dispatchWebhook(tx.id, 'AUTO_REFUNDED', { status: 'REFUNDED', reason: 'Seller did not provide delivery evidence by deadline' }, [tx.buyerId, tx.sellerId]);
        count++;
      } catch (err) {
        errors.push(`TX ${tx.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`Auto-refund scan failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { count, errors };
}

export async function checkAndFireTimers(): Promise<TimerFireResult> {
  const [releases, refunds] = await Promise.all([fireAutoReleases(), fireAutoRefunds()]);
  return {
    autoReleased: releases.count,
    autoRefunded: refunds.count,
    errors: [...releases.errors, ...refunds.errors],
  };
}
