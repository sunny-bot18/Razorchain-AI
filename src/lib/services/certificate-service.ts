import { createHmac } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';

export interface SettlementCertificate {
  version: string;
  generatedAt: string;
  transaction: {
    id: string;
    transactionNumber: string;
    status: string;
    amount: number;
    currency: string;
    poNumber: string;
    productDescription: string;
    quantity: number;
    deliveryAddress: string;
    expectedDeliveryDate: string;
    settledAt?: string;
  };
  parties: {
    buyer: { id: string; name: string; email: string; company?: string | null };
    seller: { id: string; name: string; email: string; company?: string | null };
  };
  documents: Array<{
    id: string;
    fileName: string;
    fileType: string;
    sha256: string;
    uploadedAt: string;
  }>;
  verification: {
    status: string;
    confidence: number;
    checks: unknown;
    failedChecks: string[];
    reason: string;
  } | null;
  security: {
    status: string;
    riskScore: number;
    flags: string[];
  } | null;
  payment: {
    action: string;
    amount: number;
    status: string;
    executedAt?: string;
  } | null;
  adminOverride: {
    decision: string;
    reason: string;
    approvedBy: string;
    resolvedAt: string;
  } | null;
  milestones: Array<{
    sequence: number;
    label: string;
    percentage: number;
    amount: number;
    status: string;
    settledAt?: string;
  }>;
  hmacSignature: string;
  signatureAlgorithm: string;
}

function toIsoSafe(dateVal: unknown, fallback?: string): string {
  if (!dateVal) return fallback || new Date().toISOString();
  if (dateVal instanceof Date) return dateVal.toISOString();
  if (typeof dateVal === 'string') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? dateVal : d.toISOString();
  }
  return fallback || new Date().toISOString();
}

export async function generateSettlementCertificate(
  transactionIdOrNumber: string,
): Promise<SettlementCertificate | null> {
  await ensureDatabaseInitialized();

  const tx = await findTransactionByIdOrNumber(transactionIdOrNumber);
  if (!tx) return null;

  const txUuid = tx.id;

  // Fetch all required data in parallel using the canonical txUuid
  const [
    documents,
    [verificationResult],
    [securityCheck],
    [paymentExecution],
    auditLogs,
    milestones,
  ] = await Promise.all([
    db.select().from(schema.documents).where(eq(schema.documents.transactionId, txUuid)).catch(() => []),
    db.select().from(schema.verificationResults).where(eq(schema.verificationResults.transactionId, txUuid)).limit(1).catch(() => []),
    db.select().from(schema.securityChecks).where(eq(schema.securityChecks.transactionId, txUuid)).limit(1).catch(() => []),
    db.select().from(schema.paymentExecutions).where(eq(schema.paymentExecutions.transactionId, txUuid)).limit(1).catch(() => []),
    db.select().from(schema.auditLogs).where(eq(schema.auditLogs.transactionId, txUuid)).catch(() => []),
    db.select().from(schema.paymentMilestones).where(eq(schema.paymentMilestones.transactionId, txUuid)).orderBy(schema.paymentMilestones.sequence).catch(() => []),
  ]);

  // Fetch buyer and seller
  const [[buyer], [seller]] = await Promise.all([
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, company: schema.users.company })
      .from(schema.users).where(eq(schema.users.id, tx.buyerId)).limit(1).catch(() => []),
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, company: schema.users.company })
      .from(schema.users).where(eq(schema.users.id, tx.sellerId)).limit(1).catch(() => []),
  ]);

  // Find admin override
  const adminLog = auditLogs.find((l) => l.event === 'MANUAL_REVIEW_RESOLVED' && l.result === 'SUCCESS');
  const adminMeta = adminLog?.metadata as { decision?: string; reason?: string } | null;

  const settledLog = auditLogs.find((l) => l.event === 'PAYMENT_SETTLED' || (l.result === 'SUCCESS' && l.action === 'CAPTURE'));

  const certificateData = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    transaction: {
      id: tx.id,
      transactionNumber: tx.transactionNumber,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency || 'INR',
      poNumber: tx.poNumber || 'N/A',
      productDescription: tx.productDescription || 'Consignment Goods',
      quantity: tx.quantity || 1,
      deliveryAddress: tx.deliveryAddress || 'N/A',
      expectedDeliveryDate: toIsoSafe(tx.expectedDeliveryDate),
      settledAt: settledLog ? toIsoSafe(settledLog.timestamp) : toIsoSafe(tx.updatedAt),
    },
    parties: {
      buyer: buyer ?? { id: tx.buyerId, name: 'Buyer Entity', email: 'buyer@domain.com', company: null },
      seller: seller ?? { id: tx.sellerId, name: 'Seller Entity', email: 'seller@domain.com', company: null },
    },
    documents: documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      fileType: d.fileType,
      sha256: d.sha256 ?? '',
      uploadedAt: toIsoSafe(d.uploadedAt),
    })),
    verification: verificationResult
      ? {
          status: verificationResult.status,
          confidence: verificationResult.confidence ?? 0,
          checks: verificationResult.checks,
          failedChecks: verificationResult.failedChecks || [],
          reason: verificationResult.reason ?? '',
        }
      : null,
    security: securityCheck
      ? {
          status: securityCheck.status,
          riskScore: securityCheck.riskScore,
          flags: securityCheck.flags || [],
        }
      : null,
    payment: paymentExecution
      ? {
          action: paymentExecution.action,
          amount: paymentExecution.amount,
          status: paymentExecution.status,
          executedAt: paymentExecution.executedAt ? toIsoSafe(paymentExecution.executedAt) : undefined,
        }
      : null,
    adminOverride: adminLog
      ? {
          decision: adminMeta?.decision ?? 'APPROVED',
          reason: adminMeta?.reason ?? '',
          approvedBy: adminLog.actor,
          resolvedAt: toIsoSafe(adminLog.timestamp),
        }
      : null,
    milestones: milestones.map((m) => ({
      sequence: m.sequence,
      label: m.label,
      percentage: m.percentage,
      amount: m.amount,
      status: m.status,
      settledAt: m.settledAt ? toIsoSafe(m.settledAt) : undefined,
    })),
  };

  // Sign the certificate
  const signingKey = process.env.NEXTAUTH_SECRET || 'razorchain-settlement-certificate-secret-key';
  const payload = JSON.stringify(certificateData);
  const hmacSignature = createHmac('sha256', signingKey).update(payload).digest('hex');

  return {
    ...certificateData,
    hmacSignature,
    signatureAlgorithm: 'HMAC-SHA256',
  };
}
