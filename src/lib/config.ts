/**
 * Centralized environment configuration module.
 *
 * All required and optional environment variables are declared and validated
 * here using Zod. Import `env` from this module instead of reading
 * `process.env` directly throughout the codebase.
 *
 * Validation runs once at module load time, so a misconfigured environment
 * causes a clear startup error rather than a silent runtime failure deep
 * inside an agent or service.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Google Gemini — supports single key or comma-separated pool
  GOOGLE_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v === '...' || (v && v.length < 10) ? undefined : v)),
  GOOGLE_API_KEYS: z
    .string()
    .optional()
    .transform((v) => (v?.includes('...') ? undefined : v)),

  // Razorpay — all three are optional; live mode requires all three to be set.
  RAZORPAY_KEY_ID: z
    .string()
    .optional()
    .transform((v) => (v?.includes('...') ? undefined : v)),
  RAZORPAY_KEY_SECRET: z
    .string()
    .optional()
    .transform((v) => (v?.includes('...') ? undefined : v)),
  // Explicit opt-in to live payments; defaults to 'mock'.
  RAZORCHAIN_PAYMENT_PROVIDER: z
    .enum(['razorpay', 'mock'])
    .default('mock'),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
});

// ---------------------------------------------------------------------------
// Explicit type for the validated config object
// ---------------------------------------------------------------------------

interface EnvConfig {
  DATABASE_URL: string;
  GOOGLE_API_KEY: string | undefined;
  GOOGLE_API_KEYS: string | undefined;
  RAZORPAY_KEY_ID: string | undefined;
  RAZORPAY_KEY_SECRET: string | undefined;
  RAZORCHAIN_PAYMENT_PROVIDER: 'razorpay' | 'mock';
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
}

// ---------------------------------------------------------------------------
// Parse & export
// ---------------------------------------------------------------------------

const _parsed = envSchema.safeParse(process.env);

// Only throw at startup in production/development.
// In test environments (Vitest sets process.env.VITEST = 'true') the app
// starts without all required vars, and individual agents/services guard
// themselves via the isGeminiConfigured / isRazorpayConfigured flags.
const isTestEnv =
  process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

if (!_parsed.success && !isTestEnv) {
  const formatted = _parsed.error.issues
    .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(
    `[razorchain-ai] Invalid environment configuration:\n${formatted}\n\nSee .env.example for required variables.`,
  );
}

// In test mode with missing vars, fall back to a safe partial object.
const _env: EnvConfig = _parsed.success
  ? _parsed.data
  : {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      GOOGLE_API_KEY: undefined,
      GOOGLE_API_KEYS: undefined,
      RAZORPAY_KEY_ID: undefined,
      RAZORPAY_KEY_SECRET: undefined,
      RAZORCHAIN_PAYMENT_PROVIDER: 'mock',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? '',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? '',
    };

// ---------------------------------------------------------------------------
// Derived convenience flags
// ---------------------------------------------------------------------------

/**
 * True when a valid Gemini API key is configured.
 * When false, agents fall back to demo/text-only mode.
 */
export const isGeminiConfigured: boolean =
  typeof _env.GOOGLE_API_KEY === 'string' && _env.GOOGLE_API_KEY.length >= 10;

/**
 * True when all Razorpay credentials are present AND the provider is
 * explicitly set to 'razorpay'. When false, the MockPaymentProvider is used.
 */
export const isRazorpayConfigured: boolean =
  _env.RAZORCHAIN_PAYMENT_PROVIDER === 'razorpay' &&
  typeof _env.RAZORPAY_KEY_ID === 'string' &&
  typeof _env.RAZORPAY_KEY_SECRET === 'string';

// ---------------------------------------------------------------------------
// Typed exports
// ---------------------------------------------------------------------------

export const env = {
  DATABASE_URL: _env.DATABASE_URL,
  GOOGLE_API_KEY: _env.GOOGLE_API_KEY,
  GOOGLE_API_KEYS: _env.GOOGLE_API_KEYS,
  RAZORPAY_KEY_ID: _env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: _env.RAZORPAY_KEY_SECRET,
  RAZORCHAIN_PAYMENT_PROVIDER: _env.RAZORCHAIN_PAYMENT_PROVIDER,
  NEXTAUTH_SECRET: _env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: _env.NEXTAUTH_URL,
  // Convenience flags
  isGeminiConfigured,
  isRazorpayConfigured,
} as const;
