import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { VisionAgent, type VisionOutput, type DocumentInput } from '@/lib/agents/vision-agent';
import { runSecurityCheck, runForensicCheck, type SecurityDocument } from '@/lib/agents/aegis-firewall';
import { runVerification, type VerificationDecision } from '@/lib/agents/verification-engine';
import { runExecutionCheck, type ExecutionDecision } from '@/lib/agents/execution-agent';
import { carrierService, type CarrierCode } from '@/lib/services/carrier-service';
import { dispatchWebhook } from '@/lib/services/webhook-service';
import { calculateDynamicDiscount, recordDiscountOffer } from '@/lib/services/dynamic-discount-service';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

type TransactionStatus = (typeof schema.transactionStatusEnum.enumValues)[number];

// PostgreSQL rejects JSON with null bytes (\u0000). Strip them from all string
// values recursively — this happens when binary files (images, PDFs) are
// processed and their raw bytes leak into the extracted text fields.
function sanitizeForDb(value: unknown): unknown {
  if (typeof value === 'string') {
    // eslint-disable-next-line no-control-regex
    return value.replace(/\u0000/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }
  if (Array.isArray(value)) return value.map(sanitizeForDb);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitizeForDb(v)])
    );
  }
  return value;
}


// Map verification decision status to transaction status
function mapTransactionStatus(
  verificationStatus: VerificationDecision['status']
): TransactionStatus {
  switch (verificationStatus) {
    case 'APPROVED':
      return 'VERIFIED';
    case 'MANUAL_REVIEW':
      return 'MANUAL_REVIEW';
    case 'REJECTED':
    default:
      return 'VERIFICATION_FAILED';
  }
}

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
    if (!canAccessTransaction(user, transaction)) {
      return Response.json({ error: 'Not authorized for this transaction' }, { status: 403 });
    }
    if (!['DELIVERY_PENDING', 'VERIFICATION_PENDING'].includes(transaction.status)) {
      return Response.json({ error: `Verification is not available while transaction is ${transaction.status}` }, { status: 409 });
    }

    const txUuid = transaction.id;

    const [contract] = await db
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.transactionId, txUuid))
      .limit(1);

    const [reservation] = await db
      .select()
      .from(schema.paymentReservations)
      .where(eq(schema.paymentReservations.transactionId, txUuid))
      .limit(1);

    const documentRows = await db
      .select({
        id: schema.documents.id,
        transactionId: schema.documents.transactionId,
        fileName: schema.documents.fileName,
        fileType: schema.documents.fileType,
        filePath: schema.documents.filePath,
        fileSize: schema.documents.fileSize,
        documentType: schema.documents.documentType,
        sha256: schema.documents.sha256,
        forensicMetadata: schema.documents.forensicMetadata,
      })
      .from(schema.documents)
      .where(eq(schema.documents.transactionId, txUuid));

    if (documentRows.length === 0) {
      return Response.json(
        { error: 'No documents uploaded for verification' },
        { status: 400 }
      );
    }

    // Set transaction to VERIFICATION_PENDING
    await db
      .update(schema.transactions)
      .set({ status: 'VERIFICATION_PENDING', updatedAt: new Date() })
      .where(eq(schema.transactions.id, txUuid));

    await db.insert(schema.auditLogs).values({
      transactionId: txUuid,
      userId: user.id,
      actor: user.email,
      event: 'Verification started',
      action: 'VERIFY',
      result: 'SUCCESS',
      metadata: { status: 'VERIFICATION_PENDING', documents: documentRows.length },
    });

    // 1. Run VisionAgent on documents (read buffers from disk)
    const visionInput: DocumentInput[] = [];
    for (const doc of documentRows) {
      let buffer: Buffer | undefined;
      try {
        buffer = await readFile(doc.filePath);
      } catch (err) {
        console.error(`Failed to read file ${doc.filePath}:`, err);
      }
      visionInput.push({
        filePath: doc.filePath,
        fileName: doc.fileName,
        fileType: doc.fileType,
        buffer,
      });
    }

    const visionAgent = new VisionAgent();
    const visionResult = await visionAgent.execute(visionInput);
    const visionOutput: VisionOutput | null = visionResult.data;
    // Sanitize for DB: strip null bytes and non-printable chars that crash PostgreSQL JSON
    const safeVisionOutput = sanitizeForDb(visionOutput) as VisionOutput | null;


    // 2. Run Aegis security check on extracted text
    const securityDocuments: SecurityDocument[] = documentRows.map((doc, i) => {
      let text = '';
      const extraction = visionOutput?.documents[i];
      if (extraction?.raw_text_excerpt) {
        text = extraction.raw_text_excerpt;
      }
      return {
        text,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
      };
    });
    const security = runSecurityCheck(securityDocuments);

    // 3. Run VerificationEngine comparing contract vs extracted evidence
    let verification: VerificationDecision | null = null;
    if (contract && visionOutput) {
      const storedTolerances = contract.tolerances as Partial<{
        quantity_tolerance_percent: number;
        delivery_date_tolerance_days: number;
      }> | null;

      verification = runVerification(
        {
          po_number: contract.poNumber,
          required_quantity: contract.requiredQuantity,
          amount: contract.amount,
          delivery_address: contract.deliveryAddress,
          expected_delivery_date: (contract.expectedDeliveryDate instanceof Date
            ? contract.expectedDeliveryDate.toISOString()
            : String(contract.expectedDeliveryDate || '')
          ).slice(0, 10),
          required_checks: contract.requiredChecks,
          tolerances: {
            quantity_tolerance_percent:
              storedTolerances?.quantity_tolerance_percent ?? 0,
            delivery_date_tolerance_days:
              storedTolerances?.delivery_date_tolerance_days ?? 1,
          },
        },
        visionOutput,
        visionResult.confidence
      );
    }

    // 4. Run forensic check on document metadata
    const documentForensicMeta = documentRows
      .map((d) => (d.forensicMetadata as Record<string, unknown> | null) ?? {})
      .filter(Boolean);
    const forensicResult = runForensicCheck(documentForensicMeta);
    // Merge forensic flags into security check
    if (forensicResult.flags.length > 0) {
      security.flags.push(...forensicResult.flags);
      security.riskScore = Math.max(security.riskScore, forensicResult.riskScore);
      if (forensicResult.status === 'BLOCKED') {
        security.status = 'BLOCKED';
      } else if (forensicResult.status === 'SUSPICIOUS' && security.status === 'SAFE') {
        security.status = 'SUSPICIOUS';
      }
    }

    // 5. Run carrier telemetry corroboration (non-blocking)
    let carrierCheck: { status: string; deliveredAt?: string; isDemo?: boolean } | null = null;
    if (transaction.trackingNumber && transaction.carrier) {
      try {
        const tracking = await carrierService.track(transaction.carrier as CarrierCode, transaction.trackingNumber);
        carrierCheck = { status: tracking.status, deliveredAt: tracking.deliveredAt, isDemo: tracking.isDemo };
        await db.update(schema.transactions).set({
          carrierStatus: tracking.status,
          carrierVerifiedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(schema.transactions.id, txUuid));
        // Append carrier check to verification if available
        if (verification && tracking.status === 'DELIVERED') {
          verification.checks.push({
            name: 'carrier_delivery_confirmed',
            label: 'Carrier Delivery Confirmed',
            status: 'PASS',
            expected: 'DELIVERED',
            actual: tracking.status,
            details: `Carrier (${transaction.carrier}) confirmed delivery at ${tracking.deliveredAt ?? 'unknown time'}${tracking.isDemo ? ' [demo]' : ''}`,
          });
        } else if (verification && tracking.status !== 'DELIVERED') {
          verification.checks.push({
            name: 'carrier_delivery_confirmed',
            label: 'Carrier Delivery Confirmed',
            status: 'WARN',
            expected: 'DELIVERED',
            actual: tracking.status,
            details: `Carrier shows status: ${tracking.status}`,
          });
        }
      } catch (carrierErr) {
        console.warn('[verify] Carrier check failed (non-fatal):', carrierErr);
      }
    }

    // 6. Run ExecutionAgent to determine if capture should proceed
    let execution: ExecutionDecision | null = null;
    if (verification) {
      execution = runExecutionCheck({
        transactionStatus: 'VERIFICATION_PENDING',
        verificationResult: verification,
        securityResult: security,
        paymentReservationStatus: reservation?.status,
        hasExistingPaymentExecution: false,
      });
    }

    // 7. Store all results in DB
    // Verification results
    if (verification) {
      await db
        .insert(schema.verificationResults)
        .values({
          transactionId: txUuid,
          status: verification.status,
          confidence: verification.confidence,
          checks: verification.checks as unknown as Record<string, unknown>,
          failedChecks: verification.failedChecks,
          extractedData: safeVisionOutput,
          reason: verification.reason,
        })
        .onConflictDoUpdate({
          target: schema.verificationResults.transactionId,
          set: {
            status: verification.status,
            confidence: verification.confidence,
            checks: verification.checks as unknown as Record<string, unknown>,
            failedChecks: verification.failedChecks,
            extractedData: safeVisionOutput,
            reason: verification.reason,
            updatedAt: new Date(),
          },
        });
    }

    // Security checks
    await db
      .insert(schema.securityChecks)
      .values({
        transactionId: txUuid,
        riskScore: security.riskScore,
        status: security.status,
        flags: security.flags,
        details: security.details,
      })
        .onConflictDoUpdate({
          target: schema.securityChecks.transactionId,
          set: { riskScore: security.riskScore, status: security.status, flags: security.flags, details: security.details },
        });

    // Agent runs
    const now = new Date();
    await db.insert(schema.agentRuns).values({
      transactionId: txUuid,
      agentName: visionResult.agentName,
      runId: visionResult.runId,
      status: visionResult.status,
      input: visionInput.map(({ filePath, fileName, fileType }) => ({ filePath, fileName, fileType })),
      output: safeVisionOutput,
      confidence: visionResult.confidence,
      model: visionResult.model,
      startTime: new Date(now.getTime() - visionResult.durationMs),
      endTime: now,
      durationMs: visionResult.durationMs,
    });


    // 8. Update transaction status based on result; set inspection deadline (deadman's switch)
    let finalStatus: TransactionStatus = 'VERIFICATION_FAILED';
    if (security.status !== 'SAFE') {
      finalStatus = 'MANUAL_REVIEW';
    } else if (verification) {
      finalStatus = mapTransactionStatus(verification.status);
    }

    // Set auto-release deadline if verification passed (72h default inspection window)
    const inspectionWindowHours = transaction.sellerGracePeriodHours ?? 72;
    const autoReleaseAt = finalStatus === 'VERIFIED'
      ? new Date(Date.now() + inspectionWindowHours * 60 * 60 * 1000)
      : null;

    await db
      .update(schema.transactions)
      .set({
        status: finalStatus,
        autoReleaseAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.transactions.id, txUuid));

    // Evaluate early payment dynamic discount offer
    let discountCalc = null;
    if (finalStatus === 'VERIFIED') {
      discountCalc = calculateDynamicDiscount(transaction.amount, transaction.expectedDeliveryDate, new Date());
      if (discountCalc.eligible) {
        await recordDiscountOffer(txUuid, discountCalc);
      }
    }

    // 9. Log everything to audit_logs
    await db.insert(schema.auditLogs).values({
      transactionId: txUuid,
      userId: user.id,
      actor: user.email,
      event: 'Verification completed',
      action: 'VERIFY',
      result: verification ? verification.status : 'ERROR',
      metadata: {
        status: finalStatus,
        verificationStatus: verification?.status,
        securityStatus: security.status,
        forensicFlags: forensicResult.flags,
        carrierStatus: carrierCheck?.status,
        executionAuthorized: execution?.authorized,
        visionConfidence: visionResult.confidence,
        autoReleaseAt: autoReleaseAt?.toISOString(),
      },
    });

    // 10. Dispatch webhooks
    try {
      const webhookEvent = finalStatus === 'VERIFIED'
        ? 'VERIFICATION_PASSED' as const
        : finalStatus === 'MANUAL_REVIEW'
        ? 'MANUAL_REVIEW_TRIGGERED' as const
        : 'VERIFICATION_FAILED' as const;
      void dispatchWebhook(txUuid, webhookEvent, {
        status: finalStatus,
        confidence: verification?.confidence,
        carrierStatus: carrierCheck?.status,
        autoReleaseAt: autoReleaseAt?.toISOString(),
      }, [transaction.buyerId, transaction.sellerId]);
    } catch (webhookErr) {
      console.warn('[verify] Webhook dispatch failed (non-fatal):', webhookErr);
    }

    return Response.json({
      vision: visionOutput,
      security,
      verification,
      execution,
      forensic: forensicResult,
      carrier: carrierCheck,
      autoReleaseAt: autoReleaseAt?.toISOString(),
      dynamicDiscount: discountCalc,
    });
  } catch (error) {
    console.error('Verify POST error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to run verification';
    return Response.json({ error: msg }, { status: 500 });
  }
}
