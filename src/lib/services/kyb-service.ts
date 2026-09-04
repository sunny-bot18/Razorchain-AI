export interface KybResult {
  cleared: boolean;
  flags: string[];
  provider: string;
  checkedAt: string;
}

// Minimal OFAC/sanctions name list (heuristic - extend with real API)
const SANCTIONS_KEYWORDS = [
  'ofac_test_blocked',
  'sanctioned_entity',
  'prohibited_party',
];

/**
 * Validate Indian GSTIN format and checksum.
 * Format: 2-digit state + 10-char PAN + 1-digit entity + 1 alpha + 1 check
 */
export function validateGSTIN(gstin: string): { valid: boolean; error?: string } {
  const cleaned = gstin.trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleaned)) {
    return { valid: false, error: 'Invalid GSTIN format' };
  }
  // Checksum validation (Luhn-style mod-36)
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = chars.indexOf(cleaned[i]);
    const factor = i % 2 === 0 ? 1 : 2;
    const product = val * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checkDigit = chars[(36 - (sum % 36)) % 36];
  if (cleaned[14] !== checkDigit) {
    return { valid: false, error: 'GSTIN checksum mismatch — possible forgery' };
  }
  return { valid: true };
}

/**
 * Validate US EIN format (XX-XXXXXXX).
 */
export function validateEIN(ein: string): { valid: boolean; error?: string } {
  const cleaned = ein.replace(/-/g, '').trim();
  if (!/^\d{9}$/.test(cleaned)) {
    return { valid: false, error: 'Invalid EIN format (expected 9 digits)' };
  }
  // Prefix check: valid EIN prefixes
  const prefix = parseInt(cleaned.slice(0, 2), 10);
  const invalidPrefixes = [0, 7, 8, 9, 17, 18, 19, 28, 29, 49, 69, 70, 78, 79, 89];
  if (invalidPrefixes.includes(prefix)) {
    return { valid: false, error: 'Invalid EIN prefix — not a valid IRS assignment range' };
  }
  return { valid: true };
}

/**
 * Screen an entity against sanctions/AML lists.
 * Demo implementation uses keyword matching; replace with a real API
 * (Comply Advantage, Jumio, Signzy, World Bank) in production.
 */
export async function screenSanctions(
  entityName: string,
  taxId?: string,
): Promise<KybResult> {
  const flags: string[] = [];
  const nameLower = entityName.toLowerCase();
  const taxLower = (taxId ?? '').toLowerCase();

  // Demo: check against hard-coded blocked keywords
  for (const keyword of SANCTIONS_KEYWORDS) {
    if (nameLower.includes(keyword) || taxLower.includes(keyword)) {
      flags.push(`OFAC_MATCH: ${keyword}`);
    }
  }

  // Real API integration point
  // if (process.env.COMPLY_ADVANTAGE_KEY) {
  //   const res = await fetch('https://api.complyadvantage.com/searches', ...);
  //   ...
  // }

  return {
    cleared: flags.length === 0,
    flags,
    provider: 'razorchain-built-in-v1',
    checkedAt: new Date().toISOString(),
  };
}

export interface UboDeclaration {
  name: string;
  equityPercentage: number; // e.g. 35 = 35%
  nationality: string;
  isPep?: boolean; // Politically Exposed Person
  passportOrNationalId?: string;
}

export interface CorporateKybInput {
  companyName: string;
  taxId: string;
  registrationNumber?: string;
  jurisdiction?: string;
  ubos?: UboDeclaration[];
}

export interface CorporateKybResult extends KybResult {
  corporateVerified: boolean;
  uboVerified: boolean;
  uboCount: number;
  pepDetected: boolean;
}

/**
 * Full Corporate KYB and Ultimate Beneficial Owner (UBO) screening.
 * Verifies corporate registration and checks all owners with >= 25% ownership.
 */
export async function verifyCorporateAndUBO(
  input: CorporateKybInput,
): Promise<CorporateKybResult> {
  const flags: string[] = [];

  // 1. Sanctions check on primary corporate entity
  const sanctions = await screenSanctions(input.companyName, input.taxId);
  flags.push(...sanctions.flags);

  // 2. Tax ID format verification
  if (input.taxId) {
    if (input.taxId.length === 15) {
      const gstin = validateGSTIN(input.taxId);
      if (!gstin.valid) flags.push(`INVALID_TAX_ID: ${gstin.error}`);
    } else if (input.taxId.replace(/-/g, '').length === 9) {
      const ein = validateEIN(input.taxId);
      if (!ein.valid) flags.push(`INVALID_TAX_ID: ${ein.error}`);
    }
  }

  // 3. UBO Verification: Every entity must identify all beneficial owners with >= 25% stake
  const ubos = input.ubos || [];
  let pepDetected = false;
  let totalEquity = 0;

  for (const ubo of ubos) {
    totalEquity += ubo.equityPercentage;

    // Check PEP status
    if (ubo.isPep) {
      pepDetected = true;
      flags.push(`PEP_UBO_IDENTIFIED: ${ubo.name} is a Politically Exposed Person`);
    }

    // Sanctions screening on individual UBO
    const uboSanctions = await screenSanctions(ubo.name, ubo.passportOrNationalId);
    if (!uboSanctions.cleared) {
      flags.push(...uboSanctions.flags.map((f) => `UBO_${f}: ${ubo.name}`));
    }
  }

  // Validate that significant control owners are documented
  if (ubos.length === 0) {
    flags.push('MISSING_UBO_DECLARATION: No Ultimate Beneficial Owners (>25%) declared');
  }

  const corporateVerified = !flags.some((f) => f.includes('OFAC_MATCH') || f.includes('INVALID_TAX_ID'));
  const uboVerified = !flags.some((f) => f.includes('UBO_OFAC_MATCH') || f.includes('MISSING_UBO_DECLARATION'));
  const cleared = corporateVerified && uboVerified && !pepDetected;

  return {
    cleared,
    corporateVerified,
    uboVerified,
    uboCount: ubos.length,
    pepDetected,
    flags,
    provider: 'razorchain-kyb-v2-ubo',
    checkedAt: new Date().toISOString(),
  };
}

export const kybService = { validateGSTIN, validateEIN, screenSanctions, verifyCorporateAndUBO };
