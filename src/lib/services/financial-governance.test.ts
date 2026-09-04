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
