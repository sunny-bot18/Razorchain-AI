import { VerificationDecision } from './verification-engine';
import { SecurityResult } from './aegis-firewall';

export interface ExecutionDecision {
  authorized: boolean;
  action: 'CAPTURE' | 'HOLD' | 'REJECT';
  reason: string;
  safetyChecks: Array<{ check: string; passed: boolean; detail: string }>;
}

export interface ExecutionParams {
  transactionStatus: string;
  verificationResult: VerificationDecision;
  securityResult: SecurityResult;
  paymentReservationStatus?: string;
  hasExistingPaymentExecution: boolean;
  confidenceThreshold?: number;
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.95;

export function runExecutionCheck(params: ExecutionParams): ExecutionDecision {
  const {
    transactionStatus,
    verificationResult,
    securityResult,
    paymentReservationStatus,
    hasExistingPaymentExecution,
    confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
  } = params;

  const safetyChecks: ExecutionDecision['safetyChecks'] = [];
  const failures: Array<{ check: string; detail: string }> = [];

  // 1. Transaction status check
  const txStatusValid =
    transactionStatus === 'VERIFICATION_PENDING' ||
    transactionStatus === 'VERIFIED';
  safetyChecks.push({
    check: 'transaction_status',
    passed: txStatusValid,
    detail: txStatusValid
      ? `Transaction status "${transactionStatus}" is valid`
      : `Transaction status "${transactionStatus}" is not eligible for execution`,
  });
  if (!txStatusValid) {
    failures.push({
      check: 'transaction_status',
      detail: `Invalid transaction status: ${transactionStatus}`,
    });
  }

  // 2. Verification status check
  const verificationPassed = verificationResult.status === 'APPROVED';
  safetyChecks.push({
    check: 'verification_status',
    passed: verificationPassed,
    detail: verificationPassed
      ? 'Verification status is APPROVED'
      : `Verification status is "${verificationResult.status}" — requires approval`,
  });
  if (!verificationPassed) {
    failures.push({
      check: 'verification_status',
      detail: `Verification not approved: ${verificationResult.reason}`,
    });
  }

  // 3. Security status check
  const securitySafe = securityResult.status === 'SAFE';
  const securitySuspicious = securityResult.status === 'SUSPICIOUS';
  safetyChecks.push({
    check: 'security_status',
    passed: securitySafe,
    detail: securitySafe
      ? 'Security check passed: SAFE'
      : securitySuspicious
        ? `Security check is SUSPICIOUS (risk: ${securityResult.riskScore.toFixed(2)})`
        : `Security check BLOCKED (risk: ${securityResult.riskScore.toFixed(2)})`,
  });

  // 4. Payment reservation check
  const normalizedReservationStatus = paymentReservationStatus?.toLowerCase();
  const reservationValid = normalizedReservationStatus === 'authorized';

  safetyChecks.push({
    check: 'payment_reservation',
    passed: reservationValid,
    detail: paymentReservationStatus
      ? reservationValid
        ? `Payment reservation is "${paymentReservationStatus}"`
        : `Payment reservation status "${paymentReservationStatus}" is not valid`
      : 'No payment reservation found',
  });
  if (!reservationValid) {
    failures.push({
      check: 'payment_reservation',
      detail: paymentReservationStatus
        ? `Invalid reservation status: ${paymentReservationStatus}`
        : 'No payment reservation exists',
    });
  }

  // 5. Verification confidence check
  const confidenceMet = verificationResult.confidence >= confidenceThreshold;
  safetyChecks.push({
    check: 'confidence_threshold',
    passed: confidenceMet,
    detail: confidenceMet
      ? `Confidence ${verificationResult.confidence.toFixed(2)} meets threshold ${confidenceThreshold}`
      : `Confidence ${verificationResult.confidence.toFixed(2)} below threshold ${confidenceThreshold}`,
  });
  if (!confidenceMet) {
    failures.push({
      check: 'confidence_threshold',
      detail: `Verification confidence ${verificationResult.confidence.toFixed(2)} is below required ${confidenceThreshold}`,
    });
  }

  // 6. Idempotency check
  const noExistingExecution = !hasExistingPaymentExecution;
  safetyChecks.push({
    check: 'idempotency',
    passed: noExistingExecution,
    detail: noExistingExecution
      ? 'No existing payment execution found'
      : 'A payment execution already exists for this transaction',
  });
  if (!noExistingExecution) {
    failures.push({
      check: 'idempotency',
      detail: 'Duplicate payment execution detected',
    });
  }

  // --- Decision logic ---

  // All checks passed
  if (failures.length === 0) {
    return {
      authorized: true,
      action: 'CAPTURE',
      reason: 'All safety checks passed. Transaction authorized for payment capture.',
      safetyChecks,
    };
  }

  // Security is suspicious but verification passed — HOLD for review
  if (securitySuspicious && verificationPassed) {
    return {
      authorized: false,
      action: 'HOLD',
      reason: 'Manual review required - suspicious security flags',
      safetyChecks,
    };
  }

  // Any check failed — REJECT
  const failureReasons = failures.map((f) => f.detail).join('; ');
  return {
    authorized: false,
    action: 'REJECT',
    reason: `Execution rejected: ${failureReasons}`,
    safetyChecks,
  };
}
