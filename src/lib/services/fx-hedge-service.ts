import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

export interface FxRateQuote {
  sourceCurrency: string; // e.g. USD
  targetCurrency: string; // e.g. INR
  spotRate: number;
  forwardRate: number; // rate locked for escrow window
  hedgeFeePercentage: number;
  validUntil: string;
}

// Fixed/simulated FX forward rates table (with real API hook support)
const MOCK_FX_RATES: Record<string, number> = {
  'USD_INR': 86.85,
  'EUR_INR': 94.20,
  'GBP_INR': 110.50,
  'USD_AED': 3.67,
  'USD_SGD': 1.34,
  'INR_USD': 0.0115,
};

/**
 * Fetch a forward rate quote for cross-border trade hedging.
 */
export function getFxQuote(sourceCurrency: string, targetCurrency: string): FxRateQuote {
  const pair = `${sourceCurrency.toUpperCase()}_${targetCurrency.toUpperCase()}`;
  const spotRate = MOCK_FX_RATES[pair] || 1.0;
  // 0.25% hedging fee applied to forward lock
  const hedgeFeePercentage = 0.0025;
  const forwardRate = Math.round(spotRate * (1 - hedgeFeePercentage) * 10000) / 10000;
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30-day forward lock

  return {
    sourceCurrency: sourceCurrency.toUpperCase(),
    targetCurrency: targetCurrency.toUpperCase(),
    spotRate,
    forwardRate,
    hedgeFeePercentage: hedgeFeePercentage * 100,
    validUntil,
  };
}

/**
 * Locks in FX rate for a cross-border transaction at FUNDS_RESERVED stage.
 */
export async function lockCrossBorderFx(
  transactionId: string,
  sourceCurrency: string,
  targetCurrency: string = 'INR',
) {
  const [tx] = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.id, transactionId))
    .limit(1);

  if (!tx) throw new Error('Transaction not found');

  const quote = getFxQuote(sourceCurrency, targetCurrency);
  // Calculate guaranteed seller payout in local currency
  const hedgedAmount = Math.round(tx.amount * quote.forwardRate * 100) / 100;

  await db
    .update(schema.transactions)
    .set({
      currency: quote.targetCurrency,
      lockedFxRate: quote.forwardRate,
      hedgedAmount,
      fxLockedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.transactions.id, transactionId));

  await db.insert(schema.auditLogs).values({
    transactionId,
    actor: 'system:fx-hedge',
    event: 'FX_RATE_LOCKED',
    action: 'HEDGE_LOCK',
    result: 'SUCCESS',
    metadata: {
      sourceCurrency: quote.sourceCurrency,
      targetCurrency: quote.targetCurrency,
      lockedFxRate: quote.forwardRate,
      originalAmount: tx.amount,
      hedgedAmount,
      validUntil: quote.validUntil,
    },
  });

  return {
    quote,
    hedgedAmount,
  };
}
