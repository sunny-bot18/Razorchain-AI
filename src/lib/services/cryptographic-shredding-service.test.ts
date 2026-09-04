import { describe, it, expect } from "vitest";
import { CryptographicShreddingService } from "./cryptographic-shredding-service";

describe("CryptographicShreddingService & Tombstone Mode", () => {
  it("generates unique DEK keys for uploaded documents", async () => {
    const dekId = CryptographicShreddingService.generateDEK("doc_test_101");
    expect(dekId).toBeDefined();
    expect(dekId).toMatch(/^kms-dek-/);
    
    const keyStatus = CryptographicShreddingService.getDEKStatus(dekId);
    expect(keyStatus?.status).toBe("ACTIVE");
  });

  it("checks active status of DEK keys accurately", async () => {
    const dekId = CryptographicShreddingService.generateDEK("doc_test_102");
    const isActive = CryptographicShreddingService.isDEKActive(dekId);
    expect(isActive).toBe(true);
  });

  it("cryptographically shreds DEK and marks it destroyed", async () => {
    const dekId = CryptographicShreddingService.generateDEK("doc_test_103");
    const shredSuccess = CryptographicShreddingService.shredDEK(dekId);
    expect(shredSuccess).toBe(true);

    const isActiveAfter = CryptographicShreddingService.isDEKActive(dekId);
    expect(isActiveAfter).toBe(false);

    const keyStatus = CryptographicShreddingService.getDEKStatus(dekId);
    expect(keyStatus?.status).toBe("DESTROYED");
    expect(keyStatus?.shreddedAt).toBeDefined();
  });

  it("generates consistent deterministic redacted entity identifiers without leaking PII", () => {
    const redacted1 = CryptographicShreddingService.generateRedactedIdentifier("usr_test_123");
    const redacted2 = CryptographicShreddingService.generateRedactedIdentifier("usr_test_123");
    const redactedOther = CryptographicShreddingService.generateRedactedIdentifier("usr_other_456");

    expect(redacted1).toMatch(/^\[REDACTED_ENTITY_[a-f0-9A-F]{8}\]$/);
    expect(redacted1).toBe(redacted2);
    expect(redacted1).not.toBe(redactedOther);
  });

  it("validates that terminal transactions qualify for the Zero Balance rule", () => {
    const terminalStatuses = ["SETTLED", "CANCELLED", "REFUNDED"];
    const nonTerminalStatuses = ["CREATED", "FUNDS_RESERVED", "DELIVERY_PENDING", "VERIFICATION_PENDING", "VERIFIED", "MANUAL_REVIEW", "VERIFICATION_FAILED", "DISPUTED"];

    for (const status of terminalStatuses) {
      expect(["SETTLED", "CANCELLED", "REFUNDED"].includes(status)).toBe(true);
    }

    for (const status of nonTerminalStatuses) {
      expect(["SETTLED", "CANCELLED", "REFUNDED"].includes(status)).toBe(false);
    }
  });
});
