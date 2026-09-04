import { eq } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { env } from '@/lib/config';

export interface CollateralVerification {
  transactionId: string;
  transactionNumber: string;
  escrowStatus: string;
  lockedAmount: number;
  currency: string;
  poNumber: string;
  buyerCompany: string;
  expectedDeliveryDate: string;
  collateralVerified: boolean;
  maxEligibleAdvance: number; // e.g. 85% of escrowed funds
  verificationSignature: string;
}

export interface FactoringPledgeRequest {
  transactionId: string;
  lenderId: string;
  lenderName: string;
  advancePercentage?: number; // e.g. 85
  discountFeePercentage?: number; // e.g. 2.5
}

/**
 * Third-party lender collateral verification.
 * Verifies that funds are strictly locked in escrow in FUNDS_RESERVED or DELIVERY_PENDING.
 */
export async function verifyEscrowCollateral(
  transactionId: string,
): Promise<CollateralVerification | null> {
  const [tx] = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.id, transactionId))
    .limit(1);

  if (!tx) return null;

  const [buyer] = await db
    .select({ company: schema.users.company, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, tx.buyerId))
    .limit(1);

  const isLocked = ['FUNDS_RESERVED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING'].includes(tx.status);
  const maxAdvance = Math.round(tx.amount * 0.85 * 100) / 100;

  const signaturePayload = `${tx.id}:${tx.amount}:${tx.status}:${isLocked}`;
  const verificationSignature = createHmac('sha256', env.NEXTAUTH_SECRET || 'secret')
    .update(signaturePayload)
    .digest('hex');

  return {
    transactionId: tx.id,
    transactionNumber: tx.transactionNumber,
    escrowStatus: tx.status,
    lockedAmount: tx.amount,
    currency: tx.currency || 'INR',
    poNumber: tx.poNumber,
    buyerCompany: buyer?.company || buyer?.name || 'Verified Enterprise',
    expectedDeliveryDate: tx.expectedDeliveryDate.toISOString(),
    collateralVerified: isLocked && !tx.isFactored,
    maxEligibleAdvance: maxAdvance,
    verificationSignature,
  };
}

/**
 * Pledges a transaction to a third-party lender for trade credit cash advance.
 */
export async function pledgeTransactionForFactoring(req: FactoringPledgeRequest) {
  const [tx] = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.id, req.transactionId))
    .limit(1);

  if (!tx) throw new Error('Transaction not found');
  if (tx.isFactored) throw new Error('Transaction is already pledged to a lender');
  if (!['FUNDS_RESERVED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING'].includes(tx.status)) {
    throw new Error(`Transaction in status ${tx.status} cannot be pledged for trade credit`);
  }

  const advancePct = (req.advancePercentage || 85) / 100;
  const advanceAmount = Math.round(tx.amount * advancePct * 100) / 100;
  const feePct = (req.discountFeePercentage || 2.5) / 100;
  const discountFee = Math.round(advanceAmount * feePct * 100) / 100;

  // Insert pledge record
  const [pledge] = await db
    .insert(schema.tradeCreditPledges)
    .values({
      transactionId: tx.id,
      lenderId: req.lenderId,
      lenderName: req.lenderName,
      advanceAmount,
      discountFee,
      status: 'PLEDGED',
      metadata: {
        advancePercentage: req.advancePercentage || 85,
        discountFeePercentage: req.discountFeePercentage || 2.5,
        originalEscrowAmount: tx.amount,
      },
    })
    .returning();

  // Mark transaction as factored
  await db
    .update(schema.transactions)
    .set({
      isFactored: true,
      factoringLender: req.lenderName,
      factoringAdvanceAmount: advanceAmount,
      updatedAt: new Date(),
    })
    .where(eq(schema.transactions.id, tx.id));

  await db.insert(schema.auditLogs).values({
    transactionId: tx.id,
    actor: `lender:${req.lenderName}`,
    event: 'INVOICE_FACTORED',
    action: 'FACTOR_PLEDGE',
    result: 'SUCCESS',
    metadata: {
      lenderId: req.lenderId,
      advanceAmount,
      discountFee,
      pledgeId: pledge.id,
    },
  });

  return pledge;
}

/**
 * Retrieves portfolio metrics and pledge listings for lenders.
 */
export async function getLenderPortfolio(lenderId?: string) {
  const whereClause = lenderId ? eq(schema.tradeCreditPledges.lenderId, lenderId) : undefined;

  const pledges = await db
    .select({
      pledge: schema.tradeCreditPledges,
      transactionNumber: schema.transactions.transactionNumber,
      poNumber: schema.transactions.poNumber,
      productDescription: schema.transactions.productDescription,
      escrowAmount: schema.transactions.amount,
      escrowStatus: schema.transactions.status,
      currency: schema.transactions.currency,
      expectedDeliveryDate: schema.transactions.expectedDeliveryDate,
    })
    .from(schema.tradeCreditPledges)
    .innerJoin(schema.transactions, eq(schema.tradeCreditPledges.transactionId, schema.transactions.id))
    .where(whereClause);

  let totalPledgedAmount = 0;
  let totalApprovedAmount = 0;
  let totalDisbursedAmount = 0;
  let totalSettledAmount = 0;
  let earnedFees = 0;

  for (const item of pledges) {
    const p = item.pledge;
    totalPledgedAmount += p.advanceAmount;
    if (['APPROVED', 'DISBURSED', 'SETTLED'].includes(p.status)) {
      totalApprovedAmount += p.advanceAmount;
    }
    if (['DISBURSED', 'SETTLED'].includes(p.status)) {
      totalDisbursedAmount += p.advanceAmount;
      earnedFees += p.discountFee;
    }
    if (p.status === 'SETTLED') {
      totalSettledAmount += p.advanceAmount;
    }
  }

  const outstandingExposure = totalDisbursedAmount - totalSettledAmount;

  return {
    metrics: {
      totalPledgesCount: pledges.length,
      totalPledgedAmount,
      totalApprovedAmount,
      totalDisbursedAmount,
      totalSettledAmount,
      outstandingExposure,
      earnedFees,
    },
    pledges: pledges.map((item) => ({
      ...item.pledge,
      transaction: {
        transactionNumber: item.transactionNumber,
        poNumber: item.poNumber,
        productDescription: item.productDescription,
        escrowAmount: item.escrowAmount,
        escrowStatus: item.escrowStatus,
        currency: item.currency,
        expectedDeliveryDate: item.expectedDeliveryDate,
      },
    })),
  };
}

/**
 * Lender approves a pledged trade credit request and commits capital.
 */
export async function approveFactoringPledge(
  pledgeId: string,
  options: { approvedAmount?: number; discountFee?: number; remarks?: string; actor?: string } = {}
) {
  const [pledge] = await db
    .select()
    .from(schema.tradeCreditPledges)
    .where(eq(schema.tradeCreditPledges.id, pledgeId))
    .limit(1);

  if (!pledge) throw new Error('Pledge not found');
  if (pledge.status !== 'PLEDGED') {
    throw new Error(`Pledge in status ${pledge.status} cannot be approved`);
  }

  const now = new Date();
  const updateData: Partial<typeof schema.tradeCreditPledges.$inferInsert> = {
    status: 'APPROVED',
    approvedAt: now,
  };
  if (options.approvedAmount) {
    updateData.advanceAmount = options.approvedAmount;
  }
  if (options.discountFee) {
    updateData.discountFee = options.discountFee;
  }

  const [updated] = await db
    .update(schema.tradeCreditPledges)
    .set(updateData)
    .where(eq(schema.tradeCreditPledges.id, pledgeId))
    .returning();

  await db.insert(schema.auditLogs).values({
    transactionId: pledge.transactionId,
    actor: options.actor || `lender:${pledge.lenderName}`,
    event: 'FACTORING_PLEDGE_APPROVED',
    action: 'APPROVE_PLEDGE',
    result: 'SUCCESS',
    metadata: {
      pledgeId,
      advanceAmount: updated.advanceAmount,
      discountFee: updated.discountFee,
      remarks: options.remarks,
    },
  });

  return updated;
}

/**
 * Disburse cash advance and record legal lien on transaction.
 */
export async function disburseFactoringAdvance(
  pledgeId: string,
  options: { utrNumber: string; disbursedAmount?: number; lienReference?: string; actor?: string }
) {
  const [pledge] = await db
    .select()
    .from(schema.tradeCreditPledges)
    .where(eq(schema.tradeCreditPledges.id, pledgeId))
    .limit(1);

  if (!pledge) throw new Error('Pledge not found');
  if (!['APPROVED', 'PLEDGED'].includes(pledge.status)) {
    throw new Error(`Pledge in status ${pledge.status} cannot be disbursed`);
  }

  const now = new Date();
  const lienRef = options.lienReference || `LIEN-${pledge.lenderId}-${pledgeId.slice(0, 8).toUpperCase()}`;

  const [updated] = await db
    .update(schema.tradeCreditPledges)
    .set({
      status: 'DISBURSED',
      disbursedAt: now,
      disbursementUtr: options.utrNumber,
      lienReference: lienRef,
    })
    .where(eq(schema.tradeCreditPledges.id, pledgeId))
    .returning();

  await db
    .update(schema.transactions)
    .set({
      isFactored: true,
      factoringLender: pledge.lenderName,
      factoringAdvanceAmount: updated.advanceAmount,
      updatedAt: now,
    })
    .where(eq(schema.transactions.id, pledge.transactionId));

  await db.insert(schema.auditLogs).values({
    transactionId: pledge.transactionId,
    actor: options.actor || `lender:${pledge.lenderName}`,
    event: 'FACTORING_ADVANCE_DISBURSED',
    action: 'DISBURSE_ADVANCE',
    result: 'SUCCESS',
    metadata: {
      pledgeId,
      utrNumber: options.utrNumber,
      disbursedAmount: updated.advanceAmount,
      lienReference: lienRef,
      lenderName: pledge.lenderName,
    },
  });

  return updated;
}
