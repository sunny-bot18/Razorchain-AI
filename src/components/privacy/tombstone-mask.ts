/**
 * Privacy / GDPR Tombstone Masking Utility
 * Redacts PII (names, emails, physical addresses, phone numbers, tax IDs)
 * while preserving immutable cryptographic hashes, amounts, and ledger references.
 */

export function maskPII(text: string | null | undefined, type: 'name' | 'email' | 'address' | 'taxId' | 'phone' = 'name'): string {
  if (!text) return '—';
  
  if (type === 'name') {
    const hash = Math.abs(text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 900 + 100);
    return `[REDACTED_ENTITY_${hash}]`;
  }

  if (type === 'email') {
    const [user, domain] = text.split('@');
    if (!domain) return `[REDACTED_EMAIL]`;
    const initial = user?.[0] || 'u';
    return `${initial}****@privacy.redacted`;
  }

  if (type === 'address') {
    return `[REDACTED_CONSIGNEE_FACILITY_SECURE_ZONE]`;
  }

  if (type === 'taxId') {
    return `[REDACTED_TAX_GSTIN_UBO]`;
  }

  if (type === 'phone') {
    return `+91 •••• •••• 99`;
  }

  return `[REDACTED_PII]`;
}
