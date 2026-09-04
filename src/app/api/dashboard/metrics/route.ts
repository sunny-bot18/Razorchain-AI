import { type NextRequest } from 'next/server';
import { eq, inArray, count, sum, avg, desc, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return Response.json({ error: 'Administrator access required' }, { status: 403 });
    }

    // totalTransactions
    const [{ value: totalTransactions }] = await db
      .select({ value: count() })
      .from(schema.transactions);

    // totalPaymentVolume & settledFunds (status = SETTLED)
    const [{ value: settledVolume }] = await db
      .select({ value: sum(schema.transactions.amount) })
      .from(schema.transactions)
      .where(eq(schema.transactions.status, 'SETTLED'));

    // reservedFunds
    const [{ value: reservedVolume }] = await db
      .select({ value: sum(schema.transactions.amount) })
      .from(schema.transactions)
      .where(inArray(schema.transactions.status, ['FUNDS_RESERVED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING']));

    // Verification counts
    const [{ value: verifiedCount }] = await db
      .select({ value: count() })
      .from(schema.transactions)
      .where(inArray(schema.transactions.status, ['VERIFIED', 'SETTLED']));

    const [{ value: manualReviewCount }] = await db
      .select({ value: count() })
      .from(schema.transactions)
      .where(eq(schema.transactions.status, 'MANUAL_REVIEW'));

    // Failed transactions
    const [{ value: failedCount }] = await db
      .select({ value: count() })
      .from(schema.transactions)
      .where(inArray(schema.transactions.status, ['VERIFICATION_FAILED', 'PAYMENT_FAILED']));

    // suspiciousEvidenceCount (security_checks where status != SAFE)
    const suspiciousRows = await db
      .select({ id: schema.securityChecks.id })
      .from(schema.securityChecks)
      .where(sql`${schema.securityChecks.status} != 'SAFE'`);
    const suspiciousEvidenceCount = suspiciousRows.length;

    // averageVerificationTime (from agent_runs where agentName = 'VisionAgent')
    const [{ value: avgVisionDuration }] = await db
      .select({ value: avg(schema.agentRuns.durationMs) })
      .from(schema.agentRuns)
      .where(eq(schema.agentRuns.agentName, 'VisionAgent'));

    // ---- averageSettlementTime: from transaction.createdAt to SETTLED audit log ----
    let averageSettlementTimeMs: number | null = null;
    const settledTransactions = await db
      .select({ id: schema.transactions.id, createdAt: schema.transactions.createdAt })
      .from(schema.transactions)
      .where(eq(schema.transactions.status, 'SETTLED'));

    if (settledTransactions.length > 0) {
      const settledIds = settledTransactions.map((t) => t.id);
      const settledLogs = await db
        .select({
          transactionId: schema.auditLogs.transactionId,
          timestamp: schema.auditLogs.timestamp,
          metadata: schema.auditLogs.metadata,
        })
        .from(schema.auditLogs)
        .where(
          and(
            inArray(schema.auditLogs.transactionId, settledIds),
            sql`${schema.auditLogs.action} = 'STATUS_CHANGE'`
          )
        );

      const logByTx = new Map<string, { timestamp: Date }>();
      for (const logRecord of settledLogs) {
        const meta = logRecord.metadata as { to?: string } | null;
        if (meta && meta.to === 'SETTLED' && logRecord.transactionId) {
          logByTx.set(logRecord.transactionId, logRecord as { timestamp: Date });
        }
      }

      const durations: number[] = [];
      for (const txof of settledTransactions) {
        const settledLog = logByTx.get(txof.id);
        if (settledLog?.timestamp) {
          const diff = new Date(settledLog.timestamp).getTime() - new Date(txof.createdAt).getTime();
          if (diff >= 0) durations.push(diff);
        }
      }
      if (durations.length > 0) {
        averageSettlementTimeMs = durations.reduce((a, b) => a + b, 0) / durations.length;
      }
    }

    // recentTransactions (last 10 with buyer/seller names)
    const recent = await db
      .select({
        id: schema.transactions.id,
        transactionNumber: schema.transactions.transactionNumber,
        buyerId: schema.transactions.buyerId,
        sellerId: schema.transactions.sellerId,
        poNumber: schema.transactions.poNumber,
        productDescription: schema.transactions.productDescription,
        quantity: schema.transactions.quantity,
        amount: schema.transactions.amount,
        status: schema.transactions.status,
        createdAt: schema.transactions.createdAt,
        buyerName: schema.users.name,
      })
      .from(schema.transactions)
      .leftJoin(schema.users, eq(schema.transactions.buyerId, schema.users.id))
      .orderBy(desc(schema.transactions.createdAt))
      .limit(10);

    const recentSellerIds = [...new Set(recent.map((r) => r.sellerId))];
    const recentSellers = recentSellerIds.length > 0
      ? await db
          .select({ id: schema.users.id, name: schema.users.name })
          .from(schema.users)
          .where(inArray(schema.users.id, recentSellerIds))
      : [];
    const sellerMap = new Map(recentSellers.map((s) => [s.id, s.name]));
    const recentTransactions = recent.map((r) => ({
      ...r,
      sellerName: sellerMap.get(r.sellerId) || 'Unknown',
    }));

    const totalVerified = verifiedCount + manualReviewCount + failedCount;
    const verificationSuccessRate = totalVerified > 0 ? verifiedCount / totalVerified : 0;
    const manualReviewRate = totalVerified > 0 ? manualReviewCount / totalVerified : 0;

    return Response.json({
      totalTransactions: totalTransactions ?? 0,
      totalPaymentVolume: settledVolume ?? 0,
      reservedFunds: reservedVolume ?? 0,
      settledFunds: settledVolume ?? 0,
      verificationSuccessRate,
      manualReviewRate,
      averageVerificationTime: avgVisionDuration ?? 0,
      averageSettlementTime: averageSettlementTimeMs ?? 0,
      suspiciousEvidenceCount,
      failedTransactions: failedCount ?? 0,
      recentTransactions,
    });
  } catch (error) {
    console.error('Metrics GET error:', error);
    return Response.json({ error: 'Failed to calculate metrics' }, { status: 500 });
  }
}
