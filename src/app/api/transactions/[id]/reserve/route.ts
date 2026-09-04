import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';
import { PaymentService } from '@/lib/services/payment-service';
import { dispatchWebhook } from '@/lib/services/webhook-service';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

const STATUS_SEQUENCE: Array<
  ['CREATED' | 'PAYMENT_AUTHORIZED' | 'FUNDS_RESERVED' | 'DELIVERY_PENDING', string]
> = [
  ['PAYMENT_AUTHORIZED', 'Payment authorized via Razorpay order'],
  ['FUNDS_RESERVED', 'Funds reserved against transaction'],
  ['DELIVERY_PENDING', 'Awaiting delivery and verification'],
];

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

    if (transaction.status !== 'CREATED') {
      return Response.json(
        { error: `Transaction is in status "${transaction.status}". Only CREATED transactions can be reserved.` },
        { status: 409 }
      );
    }

    if (transaction.buyerId !== user.id) {
      return Response.json(
        { error: 'Only the buyer can reserve payment for this transaction' },
        { status: 403 }
      );
    }

    // High-Value Escrow Governance: Dual Multi-Sig Mandatory for amount >= ₹10,00,000
    const DUAL_APPROVAL_THRESHOLD = 1_000_000;
    const isHighValue = transaction.amount >= DUAL_APPROVAL_THRESHOLD || transaction.requiresDualApproval;

    if (isHighValue) {
      if (!transaction.firstApproverId || !transaction.secondApproverId) {
        return Response.json(
          {
            error: `High-value escrow reservation (≥ ₹10,00,000) requires both Buyer and Seller digital multi-sig authorization before funds can be locked in escrow. Current signatures: ${transaction.firstApproverId ? '1/2 (Awaiting Seller)' : '0/2 (Awaiting Buyer)'}.`,
            requiresDualApproval: true,
            firstApproverId: transaction.firstApproverId,
            secondApproverId: transaction.secondApproverId,
          },
          { status: 403 }
        );
      }
    }

    const idempotencyKey = `reserve-${transaction.id}-${Date.now()}`;

    const paymentService = new PaymentService();
    const reservation = await paymentService.reservePayment(
      transaction.id,
      transaction.amount,
      idempotencyKey
    );

    const [savedReservation] = await db
      .insert(schema.paymentReservations)
      .values({
        transactionId: transaction.id,
        razorpayOrderId: reservation.orderId,
        razorpayPaymentId: reservation.paymentId || null,
        amount: reservation.amount,
        currency: reservation.currency,
        status: reservation.status,
        isSimulated: paymentService.getProvider() === 'mock',
        idempotencyKey,
        metadata: null,
      })
      .returning();

    // Update transaction status through the sequence, logging each change
    for (const [newStatus, event] of STATUS_SEQUENCE) {
      await db
        .update(schema.transactions)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(schema.transactions.id, transaction.id));

      await db.insert(schema.auditLogs).values({
        transactionId: transaction.id,
        userId: user.id,
        actor: user.email,
        event,
        action: 'STATUS_CHANGE',
        result: 'SUCCESS',
        metadata: { from: transaction.status, to: newStatus },
      });
    }
    void dispatchWebhook(transaction.id, 'PO_RESERVED', { status: 'DELIVERY_PENDING', amount: transaction.amount }, [transaction.buyerId, transaction.sellerId]);

    return Response.json({
      reservation: savedReservation,
      transactionNumber: transaction.transactionNumber,
    }, { status: 201 });
  } catch (error) {
    console.error('Reserve POST error:', error);
    return Response.json({ error: 'Failed to reserve payment' }, { status: 500 });
  }
}
