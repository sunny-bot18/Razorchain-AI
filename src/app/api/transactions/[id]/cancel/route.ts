import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';
import { dispatchWebhook } from '@/lib/services/webhook-service';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

const cancellationSchema = z.object({ reason: z.string().trim().min(3).max(2_000).optional() });

/** Cancels an unreserved PO or records an authorized release/refund. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const body = cancellationSchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) return Response.json({ error: 'Cancellation reason must be between 3 and 2,000 characters when supplied' }, { status: 400 });
    const reason = body.data.reason || 'No reason supplied';
    const { id } = await params;
    const transaction = await findTransactionByIdOrNumber(id);
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (['CANCELLED', 'REFUNDED', 'SETTLED'].includes(transaction.status)) return Response.json({ error: `Transaction is already ${transaction.status.toLowerCase()}` }, { status: 409 });

    const txUuid = transaction.id;

    if (transaction.status === 'CREATED') {
      if (user.role !== 'ADMIN' && user.id !== transaction.buyerId) return Response.json({ error: 'Only the buyer can cancel before funds are reserved' }, { status: 403 });
      await db.update(schema.transactions).set({ status: 'CANCELLED', updatedAt: new Date() }).where(eq(schema.transactions.id, txUuid));
      await db.insert(schema.auditLogs).values({ transactionId: txUuid, userId: user.id, actor: user.email, event: 'TRANSACTION_CANCELLED', action: 'CANCEL', result: 'SUCCESS', metadata: { reason } });
      void dispatchWebhook(txUuid, 'CANCELLED', { status: 'CANCELLED', reason }, [transaction.buyerId, transaction.sellerId]);
      return Response.json({ status: 'CANCELLED' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'SELLER' && user.id !== transaction.sellerId) return Response.json({ error: 'Only sellers or administrators can request a refund after reservation' }, { status: 403 });
    await db.update(schema.transactions).set({ status: 'REFUNDED', updatedAt: new Date() }).where(eq(schema.transactions.id, txUuid));
    await db.update(schema.paymentReservations).set({ status: 'refund_requested', updatedAt: new Date() }).where(eq(schema.paymentReservations.transactionId, txUuid));
    await db.insert(schema.auditLogs).values({ transactionId: txUuid, userId: user.id, actor: user.email, event: 'REFUND_REQUESTED', action: 'REFUND', result: 'SUCCESS', metadata: { from: transaction.status, reason } });
    void dispatchWebhook(txUuid, 'REFUNDED', { status: 'REFUNDED', reason }, [transaction.buyerId, transaction.sellerId]);
    return Response.json({ status: 'REFUNDED', message: 'Refund/release recorded. Configure the payment-provider refund webhook to confirm live settlement.' });
  } catch (error) {
    console.error('Cancel POST error:', error);
    return Response.json({ error: 'Failed to cancel or refund transaction' }, { status: 500 });
  }
}
