import { BaseAgent } from './base-agent';
import { screenSanctions, validateGSTIN, validateEIN } from '@/lib/services/kyb-service';

export interface KybInput {
  entityName: string;
  taxId?: string;
  country?: string; // 'IN' | 'US' | etc.
}

export interface KybOutput {
  cleared: boolean;
  flags: string[];
  taxIdValid?: boolean;
  taxIdError?: string;
  provider: string;
  checkedAt: string;
}

export class KybAgent extends BaseAgent<KybInput, KybOutput> {
  name = 'KybAgent';
  model = 'rule-based';

  protected async run(input: KybInput): Promise<KybOutput> {
    const results = await screenSanctions(input.entityName, input.taxId);

    let taxIdValid: boolean | undefined;
    let taxIdError: string | undefined;

    if (input.taxId) {
      const isGSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(input.taxId.trim().toUpperCase());
      const isEIN = /^\d{2}-?\d{7}$/.test(input.taxId.trim());

      if (isGSTIN || input.country === 'IN') {
        const r = validateGSTIN(input.taxId);
        taxIdValid = r.valid;
        taxIdError = r.error;
        if (!r.valid) results.flags.push(`TAX_ID_INVALID: ${r.error}`);
      } else if (isEIN || input.country === 'US') {
        const r = validateEIN(input.taxId);
        taxIdValid = r.valid;
        taxIdError = r.error;
        if (!r.valid) results.flags.push(`TAX_ID_INVALID: ${r.error}`);
      }
    }

    return {
      cleared: results.cleared && taxIdValid !== false,
      flags: results.flags,
      taxIdValid,
      taxIdError,
      provider: results.provider,
      checkedAt: results.checkedAt,
    };
  }

  protected getConfidence(output: KybOutput | null): number {
    if (!output) return 0;
    return output.cleared ? 1.0 : 0.0;
  }
}
