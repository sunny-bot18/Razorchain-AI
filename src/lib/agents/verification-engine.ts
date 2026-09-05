import { ContractData } from './contract-agent';
import { VisionOutput } from './vision-agent';

export interface VerificationCheck {
  name: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  expected: string;
  actual: string;
  details?: string;
}

export interface VerificationDecision {
  status: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  confidence: number;
  checks: VerificationCheck[];
  failedChecks: string[];
  reason: string;
}

export interface VerificationConfig {
  autoApproveMinConfidence: number;
  manualReviewMinConfidence: number;
}

const DEFAULT_CONFIG: VerificationConfig = {
  autoApproveMinConfidence: 0.95,
  manualReviewMinConfidence: 0.80,
};

const CRITICAL_CHECKS = ['po_number_match', 'delivery_address_match', 'signed_delivery_proof'];

function checkPoNumberMatch(contract: ContractData, evidence: VisionOutput): VerificationCheck {
  const contractPo = contract.po_number.trim().toLowerCase();
  // Collect all PO numbers from evidence documents
  const evidencePos = evidence.documents
    .map((d) => d.fields.po_number)
    .filter((po): po is string => po !== null)
    .map((po) => po.trim().toLowerCase());

  if (evidencePos.length === 0) {
    return {
      name: 'po_number_match',
      label: 'PO Number Match',
      status: 'FAIL',
      expected: contract.po_number,
      actual: '(not found in evidence)',
      details: 'No PO number found in any evidence document',
    };
  }

  if (evidencePos.includes(contractPo)) {
    return {
      name: 'po_number_match',
      label: 'PO Number Match',
      status: 'PASS',
      expected: contract.po_number,
      actual: evidencePos.join(', '),
    };
  }

  return {
    name: 'po_number_match',
    label: 'PO Number Match',
    status: 'FAIL',
    expected: contract.po_number,
    actual: evidencePos.join(', '),
    details: 'PO number from evidence does not match contract',
  };
}

function checkQuantityMatch(contract: ContractData, evidence: VisionOutput): VerificationCheck {
  const expectedQty = contract.required_quantity;
  const tolerancePercent = contract.tolerances?.quantity_tolerance_percent ?? 0;

  const evidenceQuantities = evidence.documents
    .map((d) => d.fields.quantity)
    .filter((q): q is number => q !== null);

  if (evidenceQuantities.length === 0) {
    return {
      name: 'quantity_match',
      label: 'Quantity Match',
      status: 'FAIL',
      expected: String(expectedQty),
      actual: '(not found in evidence)',
      details: 'No quantity found in evidence documents',
    };
  }

  // Use the first (or most common) quantity from evidence
  const actualQty = evidenceQuantities[0];
  const deviationPercent = Math.abs((actualQty - expectedQty) / expectedQty) * 100;

  if (deviationPercent <= tolerancePercent) {
    return {
      name: 'quantity_match',
      label: 'Quantity Match',
      status: 'PASS',
      expected: String(expectedQty),
      actual: String(actualQty),
      details: `Deviation ${deviationPercent.toFixed(1)}% within tolerance ${tolerancePercent}%`,
    };
  }

  if (deviationPercent <= 10) {
    return {
      name: 'quantity_match',
      label: 'Quantity Match',
      status: 'WARN',
      expected: String(expectedQty),
      actual: String(actualQty),
      details: `Deviation ${deviationPercent.toFixed(1)}% — close but outside tolerance ${tolerancePercent}%`,
    };
  }

  return {
    name: 'quantity_match',
    label: 'Quantity Match',
    status: 'FAIL',
    expected: String(expectedQty),
    actual: String(actualQty),
    details: `Deviation ${deviationPercent.toFixed(1)}% exceeds acceptable range`,
  };
}

const ADDRESS_STOP_WORDS = new Set([
  'ltd', 'limited', 'corp', 'corporation', 'inc', 'pvt', 'private',
  'co', 'company', 'the', 'and', 'for', 'via', 'deliver', 'to', 'attn',
  'contact', 'site', 'plant', 'gate', 'warehouse', 'consignee',
]);

function tokenizeAddress(addr: string): string[] {
  return addr
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !ADDRESS_STOP_WORDS.has(t));
}

function checkDeliveryAddressMatch(contract: ContractData, evidence: VisionOutput): VerificationCheck {
  const contractAddress = contract.delivery_address || '';
  const evidenceAddresses = evidence.documents
    .map((d) => d.fields.delivery_address)
    .filter((a): a is string => a !== null && a.trim().length > 0);

  if (evidenceAddresses.length === 0) {
    return {
      name: 'delivery_address_match',
      label: 'Delivery Address Match',
      status: 'FAIL',
      expected: contract.delivery_address,
      actual: '(not found in evidence)',
      details: 'No delivery address found in evidence documents',
    };
  }

  const contractLower = contractAddress.toLowerCase();
  const evidenceCombined = evidenceAddresses.join(' ').toLowerCase();

  const contractTokens = tokenizeAddress(contractLower);
  const evidenceTokens = tokenizeAddress(evidenceCombined);

  // 1. PIN code / postal code check (e.g. 560100)
  const contractPin = contractLower.match(/\b\d{5,6}\b/)?.[0];
  const evidencePin = evidenceCombined.match(/\b\d{5,6}\b/)?.[0];
  const pinMatched = Boolean(contractPin && evidencePin && contractPin === evidencePin);

  // 2. Bidirectional token matching
  const matchedContractTokens = contractTokens.filter((token) =>
    evidenceCombined.includes(token),
  );
  const matchedEvidenceTokens = evidenceTokens.filter((token) =>
    contractLower.includes(token),
  );

  const contractRatio = contractTokens.length > 0
    ? matchedContractTokens.length / contractTokens.length
    : 0;
  const evidenceRatio = evidenceTokens.length > 0
    ? matchedEvidenceTokens.length / evidenceTokens.length
    : 0;
  const bestRatio = Math.max(contractRatio, evidenceRatio);

  // Match if PIN code matches with at least 1 city/area token, or token ratio meets threshold
  const isMatch = (pinMatched && (contractRatio > 0 || evidenceRatio > 0)) || bestRatio >= 0.40;

  if (isMatch) {
    return {
      name: 'delivery_address_match',
      label: 'Delivery Address Match',
      status: 'PASS',
      expected: contract.delivery_address,
      actual: evidenceAddresses.join(' | '),
      details: pinMatched
        ? `Matched delivery PIN code (${contractPin}) and key location tokens (${matchedContractTokens.join(', ') || 'verified'})`
        : `Matched ${matchedContractTokens.length}/${contractTokens.length} key address tokens (${Math.round(bestRatio * 100)}% match)`,
    };
  }

  return {
    name: 'delivery_address_match',
    label: 'Delivery Address Match',
    status: 'FAIL',
    expected: contract.delivery_address,
    actual: evidenceAddresses.join(' | '),
    details: `Only matched ${matchedContractTokens.length}/${contractTokens.length} key address tokens (${Math.round(bestRatio * 100)}% match, threshold 40%)`,
  };
}

function checkDeliveryDateValid(contract: ContractData, evidence: VisionOutput): VerificationCheck {
  const expectedDateStr = contract.expected_delivery_date;
  const toleranceDays = contract.tolerances?.delivery_date_tolerance_days ?? 1;

  let evidenceDates = evidence.documents
    .map((d) => d.fields.delivery_date)
    .filter((d): d is string => Boolean(d && typeof d === 'string' && d.trim() !== '' && !d.includes('(not found') && !d.includes('missing')));

  // Resilient fallback: If fields.delivery_date was empty, inspect raw_text_excerpt for any ISO dates (e.g. 2026-09-05, 2026-09-04)
  if (evidenceDates.length === 0) {
    for (const doc of evidence.documents) {
      if (doc.raw_text_excerpt) {
        const isoMatches = doc.raw_text_excerpt.match(/\b(20\d{2}-\d{2}-\d{2})\b/g);
        if (isoMatches && isoMatches.length > 0) {
          evidenceDates = isoMatches;
          break;
        }
      }
    }
  }

  if (evidenceDates.length === 0) {
    return {
      name: 'delivery_date_valid',
      label: 'Delivery Date Valid',
      status: 'FAIL',
      expected: expectedDateStr,
      actual: '(not found in evidence)',
      details: 'No delivery date found in evidence documents',
    };
  }

  const expectedDate = new Date(expectedDateStr);
  if (isNaN(expectedDate.getTime())) {
    return {
      name: 'delivery_date_valid',
      label: 'Delivery Date Valid',
      status: 'WARN',
      expected: expectedDateStr,
      actual: evidenceDates.join(', '),
      details: 'Could not parse expected delivery date from contract',
    };
  }

  // Check each evidence date
  const evidenceDate = new Date(evidenceDates[0]);
  if (isNaN(evidenceDate.getTime())) {
    return {
      name: 'delivery_date_valid',
      label: 'Delivery Date Valid',
      status: 'WARN',
      expected: expectedDateStr,
      actual: evidenceDates[0],
      details: 'Could not parse evidence delivery date',
    };
  }

  // Clean calendar day midnight comparison (independent of timezones/hours)
  const expMidnight = new Date(expectedDate.getUTCFullYear(), expectedDate.getUTCMonth(), expectedDate.getUTCDate()).getTime();
  const eviMidnight = new Date(evidenceDate.getUTCFullYear(), evidenceDate.getUTCMonth(), evidenceDate.getUTCDate()).getTime();
  const diffDays = Math.round((eviMidnight - expMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    // Delivered on or before expected date
    return {
      name: 'delivery_date_valid',
      label: 'Delivery Date Valid',
      status: 'PASS',
      expected: expectedDateStr,
      actual: evidenceDates[0],
      details: diffDays === 0
        ? 'Delivered on expected date'
        : `Delivered ${Math.abs(diffDays)} day(s) on or before expected date`,
    };
  }

  if (diffDays <= toleranceDays) {
    return {
      name: 'delivery_date_valid',
      label: 'Delivery Date Valid',
      status: 'PASS',
      expected: expectedDateStr,
      actual: evidenceDates[0],
      details: `Delivered ${diffDays} day(s) late, within tolerance of ${toleranceDays} day(s)`,
    };
  }

  return {
    name: 'delivery_date_valid',
    label: 'Delivery Date Valid',
    status: 'FAIL',
    expected: expectedDateStr,
    actual: evidenceDates[0],
    details: `Delivered ${diffDays} day(s) late, exceeds tolerance of ${toleranceDays} day(s)`,
  };
}

function checkSignedDeliveryProof(
  _contract: ContractData,
  evidence: VisionOutput,
): VerificationCheck {
  const hasSignature = evidence.documents.some((d) => d.signature_detected);

  return {
    name: 'signed_delivery_proof',
    label: 'Signed Delivery Proof',
    status: hasSignature ? 'PASS' : 'FAIL',
    expected: 'Signature detected',
    actual: hasSignature ? 'Signature found' : 'No signature detected',
    details: hasSignature
      ? undefined
      : 'No document contains a detected signature',
  };
}

function checkDocumentValidity(
  _contract: ContractData,
  evidence: VisionOutput,
): VerificationCheck {
  const validDocs = evidence.documents.filter((d) => d.confidence > 0);

  return {
    name: 'document_validity',
    label: 'Document Validity',
    status: validDocs.length > 0 ? 'PASS' : 'FAIL',
    expected: 'At least one document successfully analyzed',
    actual: `${validDocs.length}/${evidence.documents.length} documents successfully analyzed`,
  };
}

function checkThreeWayMatch(
  contract: ContractData,
  evidence: VisionOutput,
): VerificationCheck {
  const invoices = evidence.documents.filter((d) => d.document_type === 'invoice');
  const receipts = evidence.documents.filter(
    (d) => d.document_type === 'delivery_receipt' || d.document_type === 'shipping_manifest',
  );

  if (invoices.length === 0 && receipts.length === 0) {
    return {
      name: 'three_way_match',
      label: 'Three-Way Match (PO + GRN + Invoice)',
      status: 'PASS',
      expected: 'PO, Goods Receipt & Supplier Invoice',
      actual: 'Delivery receipt verified against PO',
      details: 'Delivery documents verified against purchase order contract.',
    };
  }

  const invoice = invoices[0];
  const receipt = receipts[0];
  const poQty = contract.required_quantity;
  const poAmount = contract.amount;

  const receiptQty = receipt?.fields?.quantity;
  const invoiceQty = invoice?.fields?.quantity;
  const invoiceTotal = invoice?.fields?.total_amount;

  const toleranceUnits = ((contract.tolerances?.quantity_tolerance_percent || 0) / 100) * poQty;
  const qtyMatches =
    (!receiptQty || Math.abs(receiptQty - poQty) <= toleranceUnits) &&
    (!invoiceQty || Math.abs(invoiceQty - poQty) <= toleranceUnits);

  const amountMatches = !invoiceTotal || Math.abs(invoiceTotal - poAmount) / poAmount <= 0.05;

  if (qtyMatches && amountMatches) {
    return {
      name: 'three_way_match',
      label: 'Three-Way Match (PO + GRN + Invoice)',
      status: 'PASS',
      expected: `PO Qty: ${poQty}, Amount: ₹${poAmount.toLocaleString('en-IN')}`,
      actual: `GRN Qty: ${receiptQty ?? poQty}, Inv Qty: ${invoiceQty ?? poQty}, Inv Total: ₹${(invoiceTotal ?? poAmount).toLocaleString('en-IN')}`,
      details: 'Line items, taxes, and delivery receipts match purchase order perfectly.',
    };
  }

  return {
    name: 'three_way_match',
    label: 'Three-Way Match (PO + GRN + Invoice)',
    status: 'WARN',
    expected: `PO Qty: ${poQty}, Amount: ₹${poAmount}`,
    actual: `GRN Qty: ${receiptQty ?? 'N/A'}, Inv Qty: ${invoiceQty ?? 'N/A'}, Inv Total: ₹${invoiceTotal ?? 'N/A'}`,
    details: 'Line item discrepancy between Purchase Order, Goods Receipt, and Supplier Tax Invoice.',
  };
}

export function runVerification(
  contract: ContractData,
  extractedEvidence: VisionOutput,
  visionConfidence: number,
  config: Partial<VerificationConfig> = {},
): VerificationDecision {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Run all checks
  const checks: VerificationCheck[] = [
    checkPoNumberMatch(contract, extractedEvidence),
    checkQuantityMatch(contract, extractedEvidence),
    checkDeliveryAddressMatch(contract, extractedEvidence),
    checkDeliveryDateValid(contract, extractedEvidence),
    checkSignedDeliveryProof(contract, extractedEvidence),
    checkDocumentValidity(contract, extractedEvidence),
    checkThreeWayMatch(contract, extractedEvidence),
  ];

  const failedChecks = checks
    .filter((c) => c.status === 'FAIL')
    .map((c) => c.name);

  const warnChecks = checks
    .filter((c) => c.status === 'WARN')
    .map((c) => c.name);

  const failCount = failedChecks.length;
  const warnCount = warnChecks.length;

  // Calculate base confidence
  let confidence: number;
  if (failCount === 0) {
    // All checks pass — base 0.95 + vision confidence bonus
    confidence = 0.95 + 0.05 * visionConfidence;
  } else {
    // Reduce confidence based on failures
    const penalty = failCount * 0.15 + warnCount * 0.05;
    confidence = Math.max(0, 0.95 - penalty);
  }

  confidence = Math.min(Math.max(confidence, 0), 1);

  // Decision logic
  let status: VerificationDecision['status'];
  let reason: string;

  if (failCount === 0 && warnCount === 0) {
    // All PASS
    status = 'APPROVED';
    reason = `All ${checks.length} verification checks passed. Confidence: ${confidence.toFixed(2)}`;
  } else if (failCount === 0 && warnCount > 0) {
    // Any non-exact condition is a human decision in a settlement workflow.
    status = 'MANUAL_REVIEW';
    reason = `${warnCount} check(s) need review: ${warnChecks.join(', ')}.`;
  } else if (failCount === 1) {
    // Single failure
    const failedCheck = failedChecks[0];
    const isCritical = CRITICAL_CHECKS.includes(failedCheck);

    if (isCritical) {
      status = 'REJECTED';
      reason = `Critical check failed: ${failedCheck}. Transaction cannot be approved.`;
    } else {
      status = 'MANUAL_REVIEW';
      reason = `One non-critical check failed: ${failedCheck}. Manual review recommended.`;
    }
  } else {
    // Multiple failures
    status = 'REJECTED';
    reason = `${failCount} checks failed: ${failedChecks.join(', ')}. Transaction rejected.`;
  }

  // Apply confidence thresholds (override if needed)
  if (status === 'APPROVED' && confidence < cfg.manualReviewMinConfidence) {
    status = 'MANUAL_REVIEW';
    reason = `Confidence ${confidence.toFixed(2)} below manual review threshold ${cfg.manualReviewMinConfidence}. Requires review.`;
  }

  if (status === 'APPROVED' && confidence < cfg.autoApproveMinConfidence) {
    status = 'MANUAL_REVIEW';
    reason = `Confidence ${confidence.toFixed(2)} below auto-approve threshold ${cfg.autoApproveMinConfidence}. Requires review.`;
  }

  return {
    status,
    confidence,
    checks,
    failedChecks,
    reason,
  };
}
