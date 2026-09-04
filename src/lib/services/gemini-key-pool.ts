import { GoogleGenAI } from '@google/genai';
import { env } from '@/lib/config';

export interface KeyStatus {
  index: number;
  maskedKey: string;
  isAvailable: boolean;
  cooldownUntil: number | null;
  totalCalls: number;
  totalErrors: number;
  lastUsedAt: string | null;
}

export interface PoolStatus {
  totalKeys: number;
  availableKeys: number;
  inDemoMode: boolean;
  keys: KeyStatus[];
}

class GeminiKeyPool {
  private keys: string[] = [];
  private customKeys: string[] = [];
  private currentIndex = 0;
  private callCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private lastUsed: Map<string, string> = new Map();

  constructor() {
    this.refreshKeys();
  }

  /**
   * Refreshes active keys from environment variables and custom registered keys.
   * Scans GOOGLE_API_KEYS (comma-separated list), GOOGLE_API_KEY, GEMINI_API_KEY,
   * GOOGLE_API_KEY_1..10, and GEMINI_API_KEY_1..10.
   */
  public refreshKeys(): void {
    const rawKeys: string[] = [];

    // Check GOOGLE_API_KEYS (comma-separated list)
    const multiEnv = env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEYS;
    if (multiEnv) {
      const split = multiEnv.split(',').map((k: string) => k.trim());
      rawKeys.push(...split);
    }

    // Check primary GOOGLE_API_KEY & GEMINI_API_KEY
    const primary = env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (primary) {
      rawKeys.push(primary.trim());
    }

    // Check indexed keys (GOOGLE_API_KEY_1..10, GEMINI_API_KEY_1..10)
    for (let i = 1; i <= 10; i++) {
      const k = process.env[`GOOGLE_API_KEY_${i}`] || process.env[`GEMINI_API_KEY_${i}`];
      if (k) rawKeys.push(k.trim());
    }

    // Combine environment keys and dynamically registered custom keys
    const all = [...rawKeys, ...this.customKeys];

    // Filter valid keys (length >= 10, not containing '...')
    const valid = all.filter((k) => typeof k === 'string' && k.length >= 10 && !k.includes('...'));

    // Deduplicate while preserving order
    this.keys = Array.from(new Set(valid));
  }

  public isConfigured(): boolean {
    this.refreshKeys();
    return this.keys.length > 0;
  }

  public getKeyCount(): number {
    this.refreshKeys();
    return this.keys.length;
  }

  public addKey(apiKey: string): boolean {
    const trimmed = apiKey.trim();
    if (trimmed.length < 10 || trimmed.includes('...')) return false;
    if (!this.customKeys.includes(trimmed)) {
      this.customKeys.push(trimmed);
      this.refreshKeys();
      return true;
    }
    return false;
  }

  public clearCustomKeys(): void {
    this.customKeys = [];
    this.cooldowns.clear();
    this.callCounts.clear();
    this.errorCounts.clear();
    this.refreshKeys();
  }

  /**
   * Returns next available key using round-robin rotation.
   * Automatically skips keys currently in cooldown (e.g. 429 rate-limited).
   */
  public getNextKey(): string | null {
    this.refreshKeys();
    if (this.keys.length === 0) return null;

    const now = Date.now();
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      const idx = (this.currentIndex + attempt) % this.keys.length;
      const candidateKey = this.keys[idx];
      const cooldownUntil = this.cooldowns.get(candidateKey) || 0;

      if (now >= cooldownUntil) {
        this.currentIndex = (idx + 1) % this.keys.length;
        const count = this.callCounts.get(candidateKey) || 0;
        this.callCounts.set(candidateKey, count + 1);
        this.lastUsed.set(candidateKey, new Date().toISOString());
        return candidateKey;
      }
    }

    // If all keys are in cooldown, take the one that exits cooldown earliest
    let earliestKey = this.keys[0];
    let earliestTime = this.cooldowns.get(earliestKey) || Infinity;
    for (const k of this.keys) {
      const t = this.cooldowns.get(k) || 0;
      if (t < earliestTime) {
        earliestTime = t;
        earliestKey = k;
      }
    }
    return earliestKey;
  }

  /**
   * Marks a key into cooldown (default 45s) after receiving a rate-limit (429) or quota exhaustion.
   */
  public markRateLimited(apiKey: string, cooldownMs = 45000): void {
    const until = Date.now() + cooldownMs;
    this.cooldowns.set(apiKey, until);
    const errors = this.errorCounts.get(apiKey) || 0;
    this.errorCounts.set(apiKey, errors + 1);
    console.warn(`[GeminiKeyPool] API key ${this.mask(apiKey)} rate-limited. Cooldown for ${cooldownMs / 1000}s.`);
  }

  /**
   * Automatically executes an AI task using key rotation and instant failover on 429/quota errors.
   */
  public async executeWithRotation<T>(
    task: (apiKey: string, ai: GoogleGenAI) => Promise<T>
  ): Promise<T> {
    this.refreshKeys();
    const maxRetries = Math.max(1, this.keys.length);
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const key = this.getNextKey();
      if (!key) {
        throw new Error('No Google Gemini API keys configured in pool.');
      }

      try {
        const ai = new GoogleGenAI({ apiKey: key });
        return await task(key, ai);
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isRateLimit =
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('quota') ||
          errMsg.includes('rate limit');

        if (isRateLimit) {
          this.markRateLimited(key, 45000);
          if (attempt < maxRetries - 1) {
            console.info(`[GeminiKeyPool] Retrying with next available API key in pool (attempt ${attempt + 2}/${maxRetries})...`);
            continue;
          }
        }
        throw err;
      }
    }

    throw lastError;
  }

  public getPoolStatus(): PoolStatus {
    this.refreshKeys();
    const now = Date.now();
    const statuses: KeyStatus[] = this.keys.map((k, idx) => {
      const cd = this.cooldowns.get(k) || null;
      const isCooling = cd !== null && cd > now;
      return {
        index: idx + 1,
        maskedKey: this.mask(k),
        isAvailable: !isCooling,
        cooldownUntil: isCooling ? cd : null,
        totalCalls: this.callCounts.get(k) || 0,
        totalErrors: this.errorCounts.get(k) || 0,
        lastUsedAt: this.lastUsed.get(k) || null,
      };
    });

    return {
      totalKeys: this.keys.length,
      availableKeys: statuses.filter((s) => s.isAvailable).length,
      inDemoMode: this.keys.length === 0,
      keys: statuses,
    };
  }

  private mask(key: string): string {
    if (!key || key.length < 8) return '****';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }
}

export const geminiKeyPool = new GeminiKeyPool();
