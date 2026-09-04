import { describe, expect, it } from 'vitest';
import { runVerification } from './verification-engine';
import { runExecutionCheck } from './execution-agent';
import { VisionAgent } from './vision-agent';

const contract = {
  po_number: 'PO-2026-1045', required_quantity: 500, amount: 10000,
  delivery_address: 'Bengaluru', expected_delivery_date: '2026-09-05',
  required_checks: [], tolerances: { quantity_tolerance_percent: 0, delivery_date_tolerance_days: 1 },
};
const evidence = (quantity = 500) => ({ documents: [{ fileName: 'receipt.txt', document_type: 'delivery_receipt' as const, fields: { po_number: 'PO-2026-1045', quantity, delivery_address: 'Bengaluru', delivery_date: '2026-09-04', recipient: null, total_amount: 10000 }, signature_detected: true, confidence: 0.98, anomalies: [], raw_text_excerpt: '' }], overall_confidence: 0.98, missing_fields: [], inconsistencies: [] });

describe('settlement safety rules', () => {
  it('approves matching evidence deterministically', () => {
    expect(runVerification(contract, evidence(), 0.98).status).toBe('APPROVED');
  });

  it('routes a quantity mismatch to manual review', () => {
    const result = runVerification(contract, evidence(400), 0.98);
    expect(result.status).toBe('MANUAL_REVIEW');
    expect(result.failedChecks).toContain('quantity_match');
  });

  it('never authorizes capture without an authorized reservation', () => {
    const verification = runVerification(contract, evidence(), 0.98);
    const result = runExecutionCheck({ transactionStatus: 'VERIFIED', verificationResult: verification, securityResult: { riskScore: 0, status: 'SAFE', flags: [], details: {} }, paymentReservationStatus: 'created', hasExistingPaymentExecution: false });
    expect(result.authorized).toBe(false);
  });

  it('parses the demo receipt without a configured model key', async () => {
    const priorKey = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    const result = await new VisionAgent().execute([{ filePath: 'demo.txt', fileName: 'receipt.txt', fileType: 'text/plain', buffer: Buffer.from('DELIVERY RECEIPT\nReference PO: PO-2026-1045\nQuantity: 500 units\nDelivery Address: Bengaluru\nDelivery Date: 2026-09-04\nSignature: [Signed]') }]);
    process.env.GOOGLE_API_KEY = priorKey;
    expect(result.data?.documents[0].fields.po_number).toBe('PO-2026-1045');
    expect(result.data?.documents[0].signature_detected).toBe(true);
  });
});
