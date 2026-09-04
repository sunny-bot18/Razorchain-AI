import { and, desc, eq, gt, ilike, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { BaseAgent } from './base-agent';

export interface ScryInput {
  buyerId: string;
  sellerId: string;
  amount: number;
  quantity: number;
  productDescription?: string;
}

export interface ScryOutput {
  safe: boolean;
  flags: string[];
  riskScore: number;
  unitPrice: number;
  baselineUnitPrice: number | null;
  velocity24hCount: number;
  velocity24hAmount: number;
  recommendation: 'APPROVE' | 'MANUAL_REVIEW';
}

/**
 * Scry AI — Operational Anomaly Detection on Commercial Velocity and Pricing.
 * Detects account takeover, runaway volume bursts, and price tampering.
 */
export class ScryAgent extends BaseAgent<ScryInput, ScryOutput> {
  name = 'ScryAgent';
  model = 'heuristic-statistical-v1';

  protected async run(input: ScryInput): Promise<ScryOutput> {
    const flags: string[] = [];
    const unitPrice = input.quantity > 0 ? input.amount / input.quantity : input.amount;

    // 1. Commercial Velocity Check (1-hour burst velocity)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTx = await db
      .select({
        id: schema.transactions.id,
        amount: schema.transactions.amount,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.buyerId, input.buyerId),
          gt(schema.transactions.createdAt, oneHourAgo),
        ),
      );

    const velocity24hCount = recentTx.length;
    const velocity24hAmount = recentTx.reduce((sum, t) => sum + t.amount, 0) + input.amount;

    // Runaway surge threshold: > 500 transactions/hour or > 5 crore INR burst
    if (velocity24hCount >= 500) {
      flags.push(`VELOCITY_SURGE: ${velocity24hCount} transactions initiated within 1h burst window`);
    }
    if (velocity24hAmount > 500_00_000) {
      flags.push(`VELOCITY_VOLUME_SURGE: Cumulative burst volume exceeded ₹5,00,00,000 threshold`);
    }

    // 2. Pricing Outlier / Anomaly Check
    // Compare unit price against historical transactions for this buyer & seller WITH matching product description
    const whereConditions = [
      eq(schema.transactions.buyerId, input.buyerId),
      eq(schema.transactions.sellerId, input.sellerId),
    ];
    if (input.productDescription) {
      whereConditions.push(ilike(schema.transactions.productDescription, input.productDescription.trim()));
    }

    const historical = await db
      .select({
        amount: schema.transactions.amount,
        quantity: schema.transactions.quantity,
      })
      .from(schema.transactions)
      .where(and(...whereConditions))
      .orderBy(desc(schema.transactions.createdAt))
      .limit(10);

    let baselineUnitPrice: number | null = null;
    if (historical.length >= 3) {
      const historicalUnitPrices = historical
        .filter((h) => h.quantity > 0)
        .map((h) => h.amount / h.quantity);

      if (historicalUnitPrices.length > 0) {
        baselineUnitPrice =
          historicalUnitPrices.reduce((s, p) => s + p, 0) / historicalUnitPrices.length;

        // Anomaly threshold: > 5x historical average or < 0.1x historical average
        if (unitPrice > baselineUnitPrice * 5.0) {
          flags.push(
            `PRICE_ANOMALY_HIGH: Unit price ₹${unitPrice.toFixed(2)} is 500%+ of historical baseline (₹${baselineUnitPrice.toFixed(2)})`,
          );
        } else if (unitPrice < baselineUnitPrice * 0.1) {
          flags.push(
            `PRICE_ANOMALY_LOW: Unit price ₹${unitPrice.toFixed(2)} is below 10% of historical baseline (₹${baselineUnitPrice.toFixed(2)})`,
          );
        }
      }
    }

    const riskScore = Math.min(1.0, flags.length * 0.4);
    const safe = flags.length === 0;

    return {
      safe,
      flags,
      riskScore,
      unitPrice,
      baselineUnitPrice,
      velocity24hCount,
      velocity24hAmount,
      recommendation: safe ? 'APPROVE' : 'MANUAL_REVIEW',
    };
  }

  protected getConfidence(output: ScryOutput | null): number {
    if (!output) return 0;
    return output.safe ? 0.98 : 0.65;
  }
}

export const scryAgent = new ScryAgent();
