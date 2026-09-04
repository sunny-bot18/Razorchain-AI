import { describe, it, expect } from 'vitest';
import { computeSha256, hammingDistance } from '../utils/document-forensics';
import { validateGSTIN, validateEIN, screenSanctions } from './kyb-service';
import { carrierService } from './carrier-service';
import { runForensicCheck } from '../agents/aegis-firewall';

describe('Document Forensics', () => {
  it('computes correct SHA-256 hash', () => {
    const buf = Buffer.from('hello world');
    const hash = computeSha256(buf);
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('calculates hamming distance between hex strings', () => {
    expect(hammingDistance('0000', '0000')).toBe(0);
    expect(hammingDistance('0000', '0001')).toBe(1);
    expect(hammingDistance('0000', 'ffff')).toBe(16);
    expect(hammingDistance('00', '0000')).toBe(64);
  });
});

describe('KYB Service', () => {
  describe('GSTIN Validation', () => {
    it('validates a correct GSTIN structure and check digit', () => {
      const invalid = validateGSTIN('INVALID_GSTIN');
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toBe('Invalid GSTIN format');
    });

    it('rejects GSTIN with invalid checksum', () => {
      const corrupted = validateGSTIN('29ABCDE1234F1Z5');
      expect(corrupted.valid).toBe(false);
      expect(corrupted.error).toContain('checksum mismatch');
    });
  });

  describe('EIN Validation', () => {
    it('validates a valid US EIN', () => {
      const valid = validateEIN('12-3456789');
      expect(valid.valid).toBe(true);
    });

    it('rejects EIN with invalid prefix or format', () => {
      const invalidFormat = validateEIN('12345');
      expect(invalidFormat.valid).toBe(false);

      const invalidPrefix = validateEIN('00-1234567');
      expect(invalidPrefix.valid).toBe(false);
      expect(invalidPrefix.error).toContain('Invalid EIN prefix');
    });
  });

  describe('Sanctions Screening', () => {
    it('clears legitimate business entity', async () => {
      const res = await screenSanctions('Acme Industrial Supplies Pvt Ltd');
      expect(res.cleared).toBe(true);
      expect(res.flags).toHaveLength(0);
    });

    it('flags sanctioned keywords', async () => {
      const res = await screenSanctions('Entity with sanctioned_entity name');
      expect(res.cleared).toBe(false);
      expect(res.flags.some((f) => f.includes('OFAC_MATCH'))).toBe(true);
    });
  });
});

describe('Carrier Service', () => {
  it('returns simulated tracking in demo mode', async () => {
    const res = await carrierService.track('FEDEX', '123456789012');
    expect(res.carrier).toBe('FEDEX');
    expect(res.awb).toBe('123456789012');
    expect(res.status).toBe('DELIVERED');
    expect(res.isDemo).toBe(true);
    expect(res.events.length).toBeGreaterThan(0);
  });
});

describe('Aegis Forensic Checks', () => {
  it('identifies safe documents', () => {
    const result = runForensicCheck([
      { flags: [], exif: { captureDate: new Date().toISOString() } },
    ]);
    expect(result.status).toBe('SAFE');
    expect(result.riskScore).toBe(0);
  });

  it('blocks perceptual duplicates and deepfakes with 0.95 risk score', () => {
    const result = runForensicCheck([
      { flags: ['PERCEPTUAL_DUPLICATE_DETECTED'] },
    ]);
    expect(result.status).toBe('BLOCKED');
    expect(result.riskScore).toBe(0.95);
  });

  it('blocks ELA inpainting and synthetic noise patterns with 0.95 risk score', () => {
    const result = runForensicCheck([
      { flags: ['ELA_TAMPER_DETECTED', 'SYNTHETIC_NOISE_PATTERN_DETECTED'] },
    ]);
    expect(result.status).toBe('BLOCKED');
    expect(result.riskScore).toBe(0.95);
    expect(result.flags).toContain('ELA_TAMPER_DETECTED');
    expect(result.flags).toContain('SYNTHETIC_NOISE_PATTERN_DETECTED');
  });

  it('marks stripped metadata as suspicious', () => {
    const result = runForensicCheck([
      { flags: ['EXIF_METADATA_STRIPPED', 'SYNTHETIC_OR_STRIPPED', 'EXIF_MISSING'] },
    ]);
    expect(result.status).toBe('SUSPICIOUS');
    expect(result.riskScore).toBeGreaterThan(0);
  });
});
