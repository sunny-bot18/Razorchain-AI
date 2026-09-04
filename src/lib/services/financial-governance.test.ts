import { describe, it, expect } from 'vitest';
import { calculateDynamicDiscount } from './dynamic-discount-service';
import { getFxQuote } from './fx-hedge-service';
import {
  sha256,
  buildMerkleTree,
  getMerkleProof,
  verifyMerkleProof,
} from './merkle-service';
import { parseAndVerifyEInvoiceQR } from './einvoice-service';
import {
  validateGSTIN,
  validateEIN,
  verifyCorporateAndUBO,
} from './kyb-service';

describe('Dynamic Discounting Service', () => {
  it('calculates early payment discount for early delivery', () => {
    const expected = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days in future
    const verified = new Date();
    const result = calculateDynamicDiscount(100000, expected, verified);

    expect(result.eligible).toBe(true);
    expect(result.daysAhead).toBeGreaterThanOrEqual(4);
    expect(result.discountRate).toBeGreaterThanOrEqual(0.02);
    expect(result.discountAmount).toBeGreaterThanOrEqual(2000);
    expect(result.netPayableAmount).toBe(100000 - result.discountAmount);
  });

  it('declines dynamic discount if verified on or after delivery deadline', () => {
    const expected = new Date(Date.now() - 1000);
    const verified = new Date();
    const result = calculateDynamicDiscount(50000, expected, verified);

    expect(result.eligible).toBe(false);
    expect(result.discountAmount).toBe(0);
    expect(result.netPayableAmount).toBe(50000);
  });
});

describe('Cross-Border FX Hedging Service', () => {
  it('provides forward rate quote and locks in guaranteed rate', () => {
    const quote = getFxQuote('USD', 'INR');

    expect(quote.sourceCurrency).toBe('USD');
    expect(quote.targetCurrency).toBe('INR');
    expect(quote.spotRate).toBe(86.85);
    expect(quote.forwardRate).toBeGreaterThan(80);
    expect(quote.hedgeFeePercentage).toBe(0.25);
  });
});

describe('Trustless Merkle Tree & Audit Proof Service', () => {
  it('builds Merkle tree and generates independently verifiable proof', () => {
    const leaves = [
      sha256('leaf-0-audit-data'),
      sha256('leaf-1-audit-data'),
      sha256('leaf-2-audit-data'),
      sha256('leaf-3-audit-data'),
    ];

    const tree = buildMerkleTree(leaves);
    const root = tree[tree.length - 1][0];

    expect(root).toBeDefined();
    expect(root.length).toBe(64); // SHA-256 hex length

    // Test proof for leaf 1
    const proof = getMerkleProof(tree, 1);
    expect(proof.length).toBe(2);

    const verified = verifyMerkleProof(leaves[1], proof, root);
    expect(verified).toBe(true);

    // Tampered leaf must fail verification
    const tamperedVerified = verifyMerkleProof(sha256('tampered-leaf'), proof, root);
    expect(tamperedVerified).toBe(false);
  });

  it('handles odd number of leaves gracefully via duplication', () => {
    const leaves = [
      sha256('audit-entry-1'),
      sha256('audit-entry-2'),
      sha256('audit-entry-3'),
    ];
    const tree = buildMerkleTree(leaves);
    const root = tree[tree.length - 1][0];

    const proof = getMerkleProof(tree, 2);
    const verified = verifyMerkleProof(leaves[2], proof, root);
    expect(verified).toBe(true);
  });
});

describe('Digital e-Invoice & QR IRN Validation Service', () => {
  it('validates active e-Invoice QR code payload', () => {
    const rawQr = '29ABCDE1234F1Z5|27AAPFU0939F1ZV|INV-9988|2026-09-02|150000|10|8482|irn_active_valid_hash';
    const result = parseAndVerifyEInvoiceQR(rawQr);

    expect(result.valid).toBe(true);
    expect(result.status).toBe('ACTIVE');
    expect(result.extractedData?.invoiceNumber).toBe('INV-9988');
    expect(result.extractedData?.totalInvoiceValue).toBe(150000);
  });

  it('detects cancelled or duplicate-financed e-Invoices', () => {
    const cancelledQr = 'cancelled_irn_invoice_test';
    const result = parseAndVerifyEInvoiceQR(cancelledQr);

    expect(result.valid).toBe(false);
    expect(result.status).toBe('CANCELLED');
  });
});

describe('Corporate KYB & UBO Screening', () => {
  it('verifies valid GSTIN checksum and rejects invalid checksum', () => {
    expect(validateGSTIN('29ABCDE1234F1ZW').valid).toBe(true);
    expect(validateGSTIN('29ABCDE1234F1Z9').valid).toBe(false);
  });

  it('screens corporate entity and flags UBO PEP or sanctions matches', async () => {
    const corporateResult = await verifyCorporateAndUBO({
      companyName: 'Acme Global Exports Ltd',
      taxId: '29ABCDE1234F1ZW',
      registrationNumber: 'U72200KA2020PTC134567',
      ubos: [
        {
          name: 'John Doe',
          equityPercentage: 60,
          nationality: 'IN',
          isPep: false,
        },
        {
          name: 'Jane Smith',
          equityPercentage: 40,
          nationality: 'US',
          isPep: true, // Politically Exposed Person
        },
      ],
    });

    expect(corporateResult.corporateVerified).toBe(true);
    expect(corporateResult.pepDetected).toBe(true);
    expect(corporateResult.uboCount).toBe(2);
    expect(corporateResult.cleared).toBe(false); // blocked because PEP was detected
  });

  it('passes clean corporate entity with verified non-PEP UBOs', async () => {
    const cleanResult = await verifyCorporateAndUBO({
      companyName: 'TechCorp Solutions Private Limited',
      taxId: '29ABCDE1234F1ZW',
      ubos: [
        {
          name: 'Rahul Sharma',
          equityPercentage: 100,
          nationality: 'IN',
          isPep: false,
        },
      ],
    });

    expect(cleanResult.cleared).toBe(true);
    expect(cleanResult.corporateVerified).toBe(true);
    expect(cleanResult.uboVerified).toBe(true);
  });
});

describe('Settlement Certificate & Audit Dossier PDF Generation', () => {
  it('generates cryptographic settlement certificate PDF binary stream', async () => {
    const { generateSettlementCertificatePdf, generateAuditDossierPdf } = await import('./pdf-certificate-service');

    const mockCert = {
      certificateId: 'RC-CERT-12345',
      version: '2.4',
      generatedAt: new Date().toISOString(),
      escrowProtocol: 'Razorchain Dual-Key Cryptographic Escrow v2.4',
      transaction: {
        id: '11111111-1111-1111-1111-111111111111',
        transactionNumber: 'RC-TEST-999',
        status: 'SETTLED',
        poNumber: 'PO-TEST-999',
        productDescription: 'Precision CNC Machined Actuators',
        quantity: 50,
        amount: 150000,
        currency: 'INR',
        deliveryAddress: '42 Industrial Park, Bangalore, KA',
        expectedDeliveryDate: new Date().toISOString(),
        settledAt: new Date().toISOString(),
      },
      parties: {
        buyer: {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Acme Manufacturing Corp',
          email: 'buyer@acme.com',
          company: 'Acme Manufacturing Corp',
        },
        seller: {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'Apex Precision Engineering Ltd',
          email: 'seller@apex.com',
          company: 'Apex Precision Engineering Ltd',
        },
      },
      documents: [
        {
          id: 'doc-1',
          fileName: 'delivery_challan.pdf',
          fileType: 'application/pdf',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          uploadedAt: new Date().toISOString(),
        },
      ],
      verification: {
        status: 'VERIFIED',
        confidence: 0.96,
        checks: { po_match: true, qty_match: true },
        failedChecks: [],
        reason: 'Delivery Challan matches PO Number and quantity',
      },
      security: {
        status: 'PASSED_CLEAN',
        riskScore: 0.05,
        flags: [],
      },
      payment: {
        action: 'EXECUTE_PAYOUT',
        amount: 150000,
        status: 'PROCESSED',
        executedAt: new Date().toISOString(),
      },
      adminOverride: null,
      milestones: [],
      escrowReleaseSignature: {
        signature: '0x1234567890abcdef1234567890abcdef',
        signedAt: new Date().toISOString(),
        algorithm: 'HMAC-SHA256',
      },
      hmacSignature: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef',
    };

    const certPdf = generateSettlementCertificatePdf(mockCert as any);
    expect(certPdf).toBeInstanceOf(Uint8Array);
    expect(certPdf.length).toBeGreaterThan(1000);
    // PDF header magic bytes %PDF
    expect(Buffer.from(certPdf).toString('ascii', 0, 4)).toBe('%PDF');

    const mockAudit = {
      transactionNumber: 'RC-TEST-999',
      transactionId: '11111111-1111-1111-1111-111111111111',
      merkleRoot: '0xabcdef1234567890',
      generatedAt: new Date().toISOString(),
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          actor: 'buyer@example.com',
          event: 'TRANSACTION_CREATED',
          action: 'CREATE',
          result: 'SUCCESS',
          stateSnapshot: { status: 'CREATED', amount: 150000 },
        },
        {
          timestamp: new Date().toISOString(),
          actor: 'system:escrow',
          event: 'FUNDS_RESERVED',
          action: 'RESERVE',
          result: 'SUCCESS',
          stateSnapshot: { status: 'DELIVERY_PENDING', amount: 150000 },
        },
      ],
    };

    const dossierPdf = generateAuditDossierPdf(mockAudit as any);
    expect(dossierPdf).toBeInstanceOf(Uint8Array);
    expect(dossierPdf.length).toBeGreaterThan(1000);
    expect(Buffer.from(dossierPdf).toString('ascii', 0, 4)).toBe('%PDF');
  });

  it('verifies base64 document rehydration roundtrip', () => {
    const rawPdf = Buffer.from('%PDF-1.4\nTest Document Content\n%%EOF', 'utf-8');
    const base64 = rawPdf.toString('base64');
    const restored = Buffer.from(base64, 'base64');

    expect(restored.equals(rawPdf)).toBe(true);
    expect(restored.toString('utf-8')).toBe('%PDF-1.4\nTest Document Content\n%%EOF');
  });
});
