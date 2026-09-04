/**
 * Vitest global setup — runs before any test file is imported.
 *
 * We load the project's .env file here so that src/lib/config.ts can
 * validate environment variables without throwing during test runs.
 * This mirrors how Next.js automatically loads .env in dev/build mode.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(__dirname, '../.env');

try {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const rawVal = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes (single or double)
    const val = rawVal.replace(/^["']|["']$/g, '');
    // Only set if not already defined — lets CI override via real env vars
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
} catch {
  // .env not found — CI environments provide real env vars, so this is fine
}
