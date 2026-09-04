import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

export interface DynamicDiscountCalculation {
  eligible: boolean;
  daysAhead: number;
  discountRate: number; // e.g. 0.02 = 2%
  discountPercentage: number; // e.g. 2.0
  originalAmount: number;
  discountAmount: number;
  netPayableAmount: number;
  reason: string;
}

/**
 * Calculates early payment dynamic discount if AI verification completes
 * before the expected delivery date.
 * Formula: 2% base for 1+ day early + 0.1% per additional day, capped at 5%.
 */
export function calculateDynamicDiscount(
  amount: number,
  expectedDeliveryDate: Date | string,
  verifiedAt: Date | string = new Date(),
): DynamicDiscountCalculation {
  const expDate = new Date(expectedDeliveryDate);
  const vDate = new Date(verifiedAt);
  const diffMs = expDate.getTime() - vDate.getTime();
  const daysAhead = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (daysAhead < 1) {
    return {
      eligible: false,
      daysAhead: 0,
      discountRate: 0,
      discountPercentage: 0,
      originalAmount: amount,
      discountAmount: 0,
      netPayableAmount: amount,
      reason: 'Verification completed on or after expected delivery date.',
    };
  }

  // 2% base + 0.1% per additional day early, capped at 5% (0.05)
  const discountRate = Math.min(0.05, 0.02 + Math.max(0, daysAhead - 1) * 0.001);
  const discountAmount = Math.round(amount * discountRate * 100) / 100;
  const netPayableAmount = Math.round((amount - discountAmount) * 100) / 100;

  return {
    eligible: true,
    daysAhead,
    discountRate,
    discountPercentage: Math.round(discountRate * 1000) / 10,
    originalAmount: amount,
    discountAmount,
    netPayableAmount,
    reason: `Delivered & verified ${daysAhead} day${daysAhead > 1 ? 's' : ''} ahead of schedule (${(discountRate * 100).toFixed(1)}% discount).`,
  };
}

/**
 * Updates a transaction with calculated early payment discount offer.
 */
export async function recordDiscountOffer(
  transactionId: string,
  calc: DynamicDiscountCalculation,
) {
  if (!calc.eligible) return;

  await db
    .update(schema.transactions)
    .set({
      dynamicDiscountOffered: true,
      dynamicDiscountRate: calc.discountRate,
      dynamicDiscountAmount: calc.discountAmount,
      updatedAt: new Date(),
    })
    .where(eq(schema.transactions.id, transactionId));

  await db.insert(schema.auditLogs).values({
    transactionId,
    actor: 'system:dynamic-discounting',
    event: 'DYNAMIC_DISCOUNT_OFFERED',
    action: 'OFFER_DISCOUNT',
    result: 'SUCCESS',
    metadata: {
      daysAhead: calc.daysAhead,
      discountRate: calc.discountRate,
      discountAmount: calc.discountAmount,
      netPayableAmount: calc.netPayableAmount,
    },
  });
}
