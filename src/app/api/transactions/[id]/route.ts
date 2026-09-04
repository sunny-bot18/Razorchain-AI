import { type NextRequest } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

export async function GET(
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
    if (!canAccessTransaction(user, transaction)) {
      return Response.json({ error: 'Not authorized for this transaction' }, { status: 403 });
    }

    const txUuid = transaction.id;

    // Fetch all related data in parallel with resilient fallbacks
    const [
      contract,
      paymentReservation,
      documents,
      verificationResult,
      securityCheck,
      paymentExecution,
      agentRuns,
      auditLogs,
      milestones,
      pledges,
    ] = await Promise.all([
      db.select().from(schema.contracts).where(eq(schema.contracts.transactionId, txUuid)).limit(1).catch(() => []),
      db.select().from(schema.paymentReservations).where(eq(schema.paymentReservations.transactionId, txUuid)).limit(1).catch(() => []),
      db.select().from(schema.documents).where(eq(schema.documents.transactionId, txUuid)).catch(() => []),
      db.select().from(schema.verificationResults).where(eq(schema.verificationResults.transactionId, txUuid)).limit(1).catch(() => []),
      db.select().from(schema.securityChecks).where(eq(schema.securityChecks.transactionId, txUuid)).limit(1).catch(() => []),
      db.select().from(schema.paymentExecutions).where(eq(schema.paymentExecutions.transactionId, txUuid)).limit(1).catch(() => []),
      db.select().from(schema.agentRuns).where(eq(schema.agentRuns.transactionId, txUuid)).catch(() => []),
      db.select().from(schema.auditLogs).where(eq(schema.auditLogs.transactionId, txUuid)).catch(() => []),
      db.select().from(schema.paymentMilestones).where(eq(schema.paymentMilestones.transactionId, txUuid)).orderBy(schema.paymentMilestones.sequence).catch(() => []),
      db.select().from(schema.tradeCreditPledges).where(eq(schema.tradeCreditPledges.transactionId, txUuid)).catch(() => []),
    ]);

    // Fetch messages with sender info
    let messages: any[] = [];
    try {
      messages = await db
        .select({
          id: schema.transactionMessages.id,
          transactionId: schema.transactionMessages.transactionId,
          userId: schema.transactionMessages.userId,
          flaggedCheck: schema.transactionMessages.flaggedCheck,
          body: schema.transactionMessages.body,
          createdAt: schema.transactionMessages.createdAt,
          senderName: schema.users.name,
          senderRole: schema.users.role,
        })
        .from(schema.transactionMessages)
        .leftJoin(schema.users, eq(schema.transactionMessages.userId, schema.users.id))
        .where(eq(schema.transactionMessages.transactionId, txUuid))
        .orderBy(schema.transactionMessages.createdAt);
    } catch (msgErr) {
      console.warn('Could not fetch messages (non-fatal):', msgErr);
      messages = [];
    }

    // Fetch buyer, seller, and approver details
    const userIds = [
      transaction.buyerId,
      transaction.sellerId,
      transaction.firstApproverId,
      transaction.secondApproverId,
    ].filter(Boolean) as string[];

    let relatedUsers: any[] = [];
    try {
      if (userIds.length > 0) {
        relatedUsers = await db
          .select({
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
            company: schema.users.company,
            role: schema.users.role,
            isTombstoned: schema.users.isTombstoned,
            tombstonedAt: schema.users.tombstonedAt,
          })
          .from(schema.users)
          .where(inArray(schema.users.id, userIds));
      }
    } catch (userErr) {
      console.warn('Could not fetch related users (non-fatal):', userErr);
    }

    const userMap = new Map(relatedUsers.map((u) => [u.id, u]));
    const buyer = userMap.get(transaction.buyerId);
    const seller = userMap.get(transaction.sellerId);
    const firstApprover = transaction.firstApproverId ? userMap.get(transaction.firstApproverId) : null;
    const secondApprover = transaction.secondApproverId ? userMap.get(transaction.secondApproverId) : null;

    const isBuyerTombstoned = Boolean(buyer?.isTombstoned);
    const isSellerTombstoned = Boolean(seller?.isTombstoned);

    const cleanBuyerName = isBuyerTombstoned
      ? (buyer?.name || '[REDACTED USER]')
      : (buyer?.name === 'Demo Buyer' || !buyer?.name)
      ? (buyer?.company || 'Acme Manufacturing Corp')
      : buyer.name;
    const cleanSellerName = isSellerTombstoned
      ? (seller?.name || '[REDACTED USER]')
      : (seller?.name === 'Demo Seller' || !seller?.name)
      ? (seller?.company || 'Apex Precision Engineering Ltd')
      : seller.name;

    const adminResolutionLog = [...auditLogs].reverse().find((log) => log.event === 'MANUAL_REVIEW_RESOLVED' && log.result === 'SUCCESS');
    const resolutionMetadata = adminResolutionLog?.metadata as { decision?: 'APPROVED' | 'REJECTED'; reason?: string } | null;

    return Response.json({
      viewer: { id: user.id, role: user.role },
      transaction: {
        ...transaction,
        buyerName: cleanBuyerName,
        buyerCompany: isBuyerTombstoned ? null : (buyer?.company || null),
        buyerIsTombstoned: isBuyerTombstoned,
        buyerTombstonedAt: buyer?.tombstonedAt || null,
        sellerName: cleanSellerName,
        sellerCompany: isSellerTombstoned ? null : (seller?.company || null),
        sellerIsTombstoned: isSellerTombstoned,
        sellerTombstonedAt: seller?.tombstonedAt || null,
        firstApproverName: firstApprover?.name || null,
        secondApproverName: secondApprover?.name || null,
        buyer: buyer || null,
        seller: seller || null,
      },
      contract: contract[0] || null,
      paymentReservation: paymentReservation[0] || null,
      documents: documents || [],
      verificationResult: verificationResult[0] || null,
      securityCheck: securityCheck[0] || null,
      paymentExecution: paymentExecution[0] || null,
      adminResolution: adminResolutionLog ? {
        decision: resolutionMetadata?.decision || (transaction.status === 'VERIFIED' ? 'APPROVED' : 'REJECTED'),
        reason: resolutionMetadata?.reason || 'No reason recorded',
        approvedBy: adminResolutionLog.actor,
        resolvedAt: adminResolutionLog.timestamp,
      } : null,
      milestones: milestones || [],
      messages: messages || [],
      pledges: pledges || [],
      agentRuns: agentRuns || [],
      auditLogs: auditLogs || [],
    });
  } catch (error) {
    console.error('Transaction GET error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch transaction';
    return Response.json({ error: `Failed to fetch transaction: ${msg}` }, { status: 500 });
  }
}
