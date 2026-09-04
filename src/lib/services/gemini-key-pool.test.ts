import { describe, it, expect, beforeEach } from 'vitest';
import { geminiKeyPool } from './gemini-key-pool';

describe('GeminiKeyPool (Multi-Key Load Balancer & Failover)', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEYS;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY_1;
    delete process.env.GOOGLE_API_KEY_2;
    delete process.env.GOOGLE_API_KEY_3;
    geminiKeyPool.clearCustomKeys();
  });

  it('correctly registers and masks dynamically added keys', () => {
    const added1 = geminiKeyPool.addKey('AIzaSyTestKeyAlpha1234567890');
    const added2 = geminiKeyPool.addKey('AIzaSyTestKeyBeta0987654321');

    expect(added1).toBe(true);
    expect(added2).toBe(true);
    expect(geminiKeyPool.getKeyCount()).toBeGreaterThanOrEqual(2);

    const status = geminiKeyPool.getPoolStatus();
    expect(status.inDemoMode).toBe(false);
    expect(status.totalKeys).toBeGreaterThanOrEqual(2);
    expect(status.keys[0].maskedKey).toMatch(/^AIza\.\.\.[0-9A-Za-z]{4}$/);
  });

  it('performs round-robin rotation across available keys', () => {
    geminiKeyPool.addKey('AIzaSyKeyA11111111111111111111');
    geminiKeyPool.addKey('AIzaSyKeyB22222222222222222222');

    const key1 = geminiKeyPool.getNextKey();
    const key2 = geminiKeyPool.getNextKey();

    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).not.toBe(key2);
  });

  it('places rate-limited keys into cooldown and fails over to healthy keys', () => {
    const keyA = 'AIzaSyKeyToThrottle111111111111';
    const keyB = 'AIzaSyKeyHealthy22222222222222';
    geminiKeyPool.addKey(keyA);
    geminiKeyPool.addKey(keyB);

    // Throttle Key A with 30s cooldown
    geminiKeyPool.markRateLimited(keyA, 30000);

    const status = geminiKeyPool.getPoolStatus();
    const statusA = status.keys.find((k) => k.maskedKey.startsWith('AIza'));
    expect(statusA).toBeDefined();

    // Next key call should automatically pick healthy key
    const selectedKey = geminiKeyPool.getNextKey();
    expect(selectedKey).toBe(keyB);
  });
});
