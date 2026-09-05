import { describe, expect, it } from 'vitest';
import { runVerification } from './verification-engine';
import { runExecutionCheck } from './execution-agent';
import { VisionAgent } from './vision-agent';
import { getBoundingBoxesForDocument } from '@/components/ai/side-by-side-document-verifier';
import { formatDate } from '@/lib/utils';

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

  it('matches delivery challan consignee address against contract warehouse destination', () => {
    const testContract = {
      ...contract,
      delivery_address: 'Warehouse 4, Electronic City, Bengaluru - 560100',
    };
    const testEvidence = {
      documents: [{
        fileName: '1_clean_delivery_challan.jpg',
        document_type: 'delivery_receipt' as const,
        fields: {
          po_number: 'PO-2026-1045',
          quantity: 500,
          delivery_address: 'Acme Manufacturing Corp, Manufacturing Plant 4, Warehouse Gate 3, Electronic City Phase 2, Bengaluru 560100',
          delivery_date: '2026-09-05',
          recipient: 'Rajesh Kumar',
          total_amount: 10000,
        },
        signature_detected: true,
        confidence: 0.98,
        anomalies: [],
        raw_text_excerpt: '',
      }],
      overall_confidence: 0.98,
      missing_fields: [],
      inconsistencies: [],
    };
    const result = runVerification(testContract, testEvidence, 0.98);
    const addressCheck = result.checks.find((c) => c.name === 'delivery_address_match');
    expect(addressCheck?.status).toBe('PASS');
    expect(result.failedChecks).not.toContain('delivery_address_match');
  });

  it('matches delivery date on expected date or within tolerance', () => {
    const testContract = {
      ...contract,
      expected_delivery_date: '2026-09-05',
    };
    const testEvidenceSameDay = {
      documents: [{
        fileName: '2_commercial_tax_invoice.jpg',
        document_type: 'invoice' as const,
        fields: {
          po_number: 'PO-2026-1045',
          quantity: 500,
          delivery_address: 'Bengaluru',
          delivery_date: '2026-09-05',
          recipient: null,
          total_amount: 10000,
        },
        signature_detected: true,
        confidence: 0.98,
        anomalies: [],
        raw_text_excerpt: '',
      }],
      overall_confidence: 0.98,
      missing_fields: [],
      inconsistencies: [],
    };
    const result = runVerification(testContract, testEvidenceSameDay, 0.98);
    const dateCheck = result.checks.find((c) => c.name === 'delivery_date_valid');
    expect(dateCheck?.status).toBe('PASS');
    expect(result.failedChecks).not.toContain('delivery_date_valid');
  });

  it('recovers delivery date from raw_text_excerpt when fields.delivery_date is empty', () => {
    const testContract = {
      ...contract,
      expected_delivery_date: '2026-09-05',
    };
    const testEvidenceRawText = {
      documents: [{
        fileName: '2_commercial_tax_invoice.jpg',
        document_type: 'invoice' as const,
        fields: {
          po_number: 'PO-2026-1045',
          quantity: 500,
          delivery_address: 'Bengaluru',
          delivery_date: null,
          recipient: null,
          total_amount: 10000,
        },
        signature_detected: true,
        confidence: 0.95,
        anomalies: [],
        raw_text_excerpt: 'TAX INVOICE INV-2026-08492 Date: 2026-09-04 DUE DATE / TERMS 2026-09-05',
      }],
      overall_confidence: 0.95,
      missing_fields: [],
      inconsistencies: [],
    };
    const result = runVerification(testContract, testEvidenceRawText, 0.95);
    const dateCheck = result.checks.find((c) => c.name === 'delivery_date_valid');
    expect(dateCheck?.status).toBe('PASS');
    expect(result.failedChecks).not.toContain('delivery_date_valid');
  });

  it('flags address mismatch when delivery site is fundamentally different', () => {
    const testContract = {
      ...contract,
      delivery_address: 'Manufacturing Plant 4, Warehouse Gate 3, Electronic City Phase 2, Bengaluru 560100',
    };
    const testEvidence = {
      documents: [{
        fileName: 'wrong_site_challan.jpg',
        document_type: 'delivery_receipt' as const,
        fields: {
          po_number: 'PO-2026-1045',
          quantity: 500,
          delivery_address: 'Industrial Sector 9, Hosur Road, Tamil Nadu',
          delivery_date: '2026-09-05',
          recipient: 'Rajesh Kumar',
          total_amount: 10000,
        },
        signature_detected: true,
        confidence: 0.98,
        anomalies: [],
        raw_text_excerpt: '',
      }],
      overall_confidence: 0.98,
      missing_fields: [],
      inconsistencies: [],
    };
    const result = runVerification(testContract, testEvidence, 0.98);
    const addressCheck = result.checks.find((c) => c.name === 'delivery_address_match');
    expect(addressCheck?.status).toBe('FAIL');
    expect(result.failedChecks).toContain('delivery_address_match');
  });
});

describe('document bounding box precision', () => {
  it('places bounding boxes exactly on commercial tax invoice coordinates', () => {
    const boxes = getBoundingBoxesForDocument('2_commercial_tax_invoice.jpg');
    // delivery_date must be positioned over DUE DATE / TERMS column (x ~74%, y ~10.5%), NOT payment escrow VAN (x ~52%)
    expect(boxes.delivery_date[0]).toBeCloseTo(10.5, 0.5);
    expect(boxes.delivery_date[1]).toBeCloseTo(74.2, 0.5);

    // quantity must be positioned over 500 Nos in table row (x ~53.2%, y ~33.7%), NOT subtotal (y ~38%, x ~69%)
    expect(boxes.quantity[0]).toBeCloseTo(33.7, 0.5);
    expect(boxes.quantity[1]).toBeCloseTo(53.2, 0.5);

    // signature & stamp must be positioned over authorized signatory card (y ~62.1%), NOT pushed down and cut off (y ~70%)
    expect(boxes.receiver_signature[0]).toBeCloseTo(62.1, 0.5);
    expect(boxes.receiver_signature[1]).toBeCloseTo(50.0, 0.5);

    // po_number over purchase order reference column
    expect(boxes.po_number[0]).toBeCloseTo(10.5, 0.5);
    expect(boxes.po_number[1]).toBeCloseTo(29.0, 0.5);

    // delivery_address over SHIPPED TO consignee card
    expect(boxes.delivery_address[0]).toBeCloseTo(18.2, 0.5);
    expect(boxes.delivery_address[1]).toBeCloseTo(50.0, 0.5);
  });

  it('places bounding boxes on clean delivery challan coordinates', () => {
    const boxes = getBoundingBoxesForDocument('1_clean_delivery_challan.jpg');
    expect(boxes.delivery_date[1]).toBeCloseTo(52.4, 0.5);
    expect(boxes.quantity[1]).toBeCloseTo(70.2, 0.5);
  });
});

describe('resilient date formatting', () => {
  it('never outputs "Invalid Date" for sentinel strings', () => {
    expect(formatDate('(not found in evidence)')).toBe('—');
    expect(formatDate('(missing)')).toBe('—');
    expect(formatDate('invalid date string')).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('formats valid dates accurately', () => {
    expect(formatDate('2026-09-05')).toMatch(/5 Sep/);
  });
});


