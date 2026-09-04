import { createHmac } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { env } from '@/lib/config';

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

export async function generateSettlementCertificate(
  transactionId: string,
): Promise<SettlementCertificate | null> {
  // Fetch all required data in parallel
  const [
    [tx],
    documents,
    [verificationResult],
    [securityCheck],
    [paymentExecution],
    auditLogs,
    milestones,
  ] = await Promise.all([
    db.select().from(schema.transactions).where(eq(schema.transactions.id, transactionId)).limit(1),
    db.select().from(schema.documents).where(eq(schema.documents.transactionId, transactionId)),
    db.select().from(schema.verificationResults).where(eq(schema.verificationResults.transactionId, transactionId)).limit(1),
    db.select().from(schema.securityChecks).where(eq(schema.securityChecks.transactionId, transactionId)).limit(1),
    db.select().from(schema.paymentExecutions).where(eq(schema.paymentExecutions.transactionId, transactionId)).limit(1),
    db.select().from(schema.auditLogs).where(eq(schema.auditLogs.transactionId, transactionId)),
    db.select().from(schema.paymentMilestones).where(eq(schema.paymentMilestones.transactionId, transactionId)).orderBy(schema.paymentMilestones.sequence),
  ]);

  if (!tx) return null;

  // Fetch buyer and seller
  const [[buyer], [seller]] = await Promise.all([
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, company: schema.users.company })
      .from(schema.users).where(eq(schema.users.id, tx.buyerId)).limit(1),
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, company: schema.users.company })
      .from(schema.users).where(eq(schema.users.id, tx.sellerId)).limit(1),
  ]);

  // Find admin override
  const adminLog = auditLogs.find((l) => l.event === 'MANUAL_REVIEW_RESOLVED' && l.result === 'SUCCESS');
  const adminMeta = adminLog?.metadata as { decision?: string; reason?: string } | null;

  const settledLog = auditLogs.find((l) => l.event === 'PAYMENT_SETTLED' || l.result === 'SUCCESS' && l.action === 'CAPTURE');

  const certificateData = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    transaction: {
      id: tx.id,
      transactionNumber: tx.transactionNumber,
      status: tx.status,
      amount: tx.amount,
      currency: 'INR',
      poNumber: tx.poNumber,
      productDescription: tx.productDescription,
      quantity: tx.quantity,
      deliveryAddress: tx.deliveryAddress,
      expectedDeliveryDate: tx.expectedDeliveryDate.toISOString(),
      settledAt: settledLog?.timestamp.toISOString(),
    },
    parties: {
      buyer: buyer ?? { id: tx.buyerId, name: 'Unknown', email: 'unknown' },
      seller: seller ?? { id: tx.sellerId, name: 'Unknown', email: 'unknown' },
    },
    documents: documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      fileType: d.fileType,
      sha256: d.sha256 ?? '',
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    verification: verificationResult
      ? {
          status: verificationResult.status,
          confidence: verificationResult.confidence ?? 0,
          checks: verificationResult.checks,
          failedChecks: verificationResult.failedChecks,
          reason: verificationResult.reason ?? '',
        }
      : null,
    security: securityCheck
      ? {
          status: securityCheck.status,
          riskScore: securityCheck.riskScore,
          flags: securityCheck.flags,
        }
      : null,
    payment: paymentExecution
      ? {
          action: paymentExecution.action,
          amount: paymentExecution.amount,
          status: paymentExecution.status,
          executedAt: paymentExecution.executedAt?.toISOString(),
        }
      : null,
    adminOverride: adminLog
      ? {
          decision: adminMeta?.decision ?? 'APPROVED',
          reason: adminMeta?.reason ?? '',
          approvedBy: adminLog.actor,
          resolvedAt: adminLog.timestamp.toISOString(),
        }
      : null,
    milestones: milestones.map((m) => ({
      sequence: m.sequence,
      label: m.label,
      percentage: m.percentage,
      amount: m.amount,
      status: m.status,
      settledAt: m.settledAt?.toISOString(),
    })),
  };

  // Sign the certificate
  const signingKey = env.NEXTAUTH_SECRET;
  const payload = JSON.stringify(certificateData);
  const hmacSignature = createHmac('sha256', signingKey).update(payload).digest('hex');

  return {
    ...certificateData,
    hmacSignature,
    signatureAlgorithm: 'HMAC-SHA256',
  };
}
