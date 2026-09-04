import { createHash, randomBytes } from 'crypto';
import { eq, or, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

// In-Memory & Ledger-Backed Simulated KMS (Key Management Service) Key Store
// In production, this interfaces with AWS KMS, HashiCorp Vault, or Google Cloud KMS
const KMS_KEY_STORE = new Map<string, {
  dekId: string;
  documentId: string;
  keyCiphertext: string;
  status: 'ACTIVE' | 'SHREDDED';
  createdAt: Date;
  shreddedAt?: Date;
}>();

export class CryptographicShreddingService {
  /**
   * Generates and registers a new Data Encryption Key (DEK) for a document
   */
  static generateDEK(documentId: string): string {
    const dekId = `kms-dek-${randomBytes(12).toString('hex')}`;
    const simulatedKeyCiphertext = randomBytes(32).toString('hex');
    
    KMS_KEY_STORE.set(dekId, {
      dekId,
      documentId,
      keyCiphertext: simulatedKeyCiphertext,
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    return dekId;
  }

  /**
   * Cryptographically shreds a DEK in the KMS vault, rendering the ciphertext permanently unreadable
   */
  static shredDEK(dekId: string): boolean {
    const keyRecord = KMS_KEY_STORE.get(dekId);
    if (keyRecord) {
      keyRecord.status = 'SHREDDED';
      keyRecord.keyCiphertext = 'DESTROYED_0x00000000000000000000000000000000';
      keyRecord.shreddedAt = new Date();
      return true;
    }
    KMS_KEY_STORE.set(dekId, {
      dekId,
      documentId: 'unknown',
      keyCiphertext: 'DESTROYED_0x00000000000000000000000000000000',
      status: 'SHREDDED',
      createdAt: new Date(),
      shreddedAt: new Date(),
    });
    return true;
  }

  /**
   * Verifies whether a document's DEK is active or mathematically destroyed
   */
  static isDEKActive(dekId: string | null | undefined): boolean {
    if (!dekId) return false;
    const keyRecord = KMS_KEY_STORE.get(dekId);
    if (!keyRecord) return true; // Default active if unmanaged
    return keyRecord.status === 'ACTIVE';
  }

  /**
   * Retrieves DEK metadata and destruction status
   */
  static getDEKStatus(dekId: string): {
    dekId: string;
    status: 'ACTIVE' | 'SHREDDED' | 'DESTROYED';
    createdAt: Date;
    shreddedAt?: Date;
    shreddedReason?: string;
  } | null {
    const keyRecord = KMS_KEY_STORE.get(dekId);
    if (!keyRecord) return null;
    return {
      dekId: keyRecord.dekId,
      status: keyRecord.status === 'SHREDDED' ? 'DESTROYED' : 'ACTIVE',
      createdAt: keyRecord.createdAt,
      shreddedAt: keyRecord.shreddedAt,
      shreddedReason: keyRecord.status === 'SHREDDED' ? 'GDPR Art 17 / DPDP Erasure' : undefined,
    };
  }

  /**
   * Generates deterministic anonymous redacted entity identifier
   */
  static generateRedactedIdentifier(userId: string): string {
    const shortHash = createHash('sha256')
      .update(userId + 'razorchain_privacy_salt')
      .digest('hex')
      .slice(0, 8)
      .toUpperCase();
    return `[REDACTED_ENTITY_${shortHash}]`;
  }

  /**
   * Executes full-scale User Tombstone & Cascading Cryptographic Shredding
   * Preserves: Primary Key (id), Foreign Key Relations, Immutable Financial Ledger, Merkle State Hashes
   * Purges: Raw PII, Contact Information, Decryption Keys (DEKs)
   */
  static async executeUserTombstone(
    userId: string,
    reason = 'Statutory Right to be Forgotten (GDPR Art 17 / India DPDP Act)',
    actor = 'compliance_officer'
  ): Promise<{
    success: boolean;
    userId: string;
    redactedName: string;
    shreddedDocumentsCount: number;
    tombstonedAt: string;
  }> {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (user.isTombstoned) {
      return {
        success: true,
        userId: user.id,
        redactedName: user.name,
        shreddedDocumentsCount: 0,
        tombstonedAt: user.tombstonedAt?.toISOString() || new Date().toISOString(),
      };
    }

    // 1. Generate Deterministic Redaction Identifiers
    const shortHash = createHash('sha256')
      .update(user.id + 'razorchain_privacy_salt')
      .digest('hex')
      .slice(0, 8)
      .toUpperCase();

    const redactedName = `[REDACTED_ENTITY_${shortHash}]`;
    const redactedEmail = `tombstoned_${shortHash.toLowerCase()}@privacy.redacted`;
    const redactedCompany = user.company ? `[REDACTED_CORP_${shortHash}]` : null;
    const tombstonedAt = new Date();

    // 2. Overwrite User PII in Database (Preserving Foreign Key relational links)
    await db
      .update(schema.users)
      .set({
        name: redactedName,
        email: redactedEmail,
        company: redactedCompany,
        taxId: null,
        passwordHash: `TOMBSTONED_EXPIRED_${randomBytes(16).toString('hex')}`,
        uboDetails: null,
        corporateRegistration: null,
        isTombstoned: true,
        tombstonedAt,
        tombstoneReason: reason,
        updatedAt: tombstonedAt,
      })
      .where(eq(schema.users.id, user.id));

    // 3. Find All Associated Transactions to Cascade Cryptographic Shredding
    const userTransactions = await db
      .select({ id: schema.transactions.id })
      .from(schema.transactions)
      .where(or(eq(schema.transactions.buyerId, user.id), eq(schema.transactions.sellerId, user.id)));

    const txIds = userTransactions.map((t) => t.id);
    let shreddedCount = 0;

    if (txIds.length > 0) {
      const userDocs = await db
        .select()
        .from(schema.documents)
        .where(inArray(schema.documents.transactionId, txIds));

      for (const doc of userDocs) {
        if (!doc.isShredded) {
          const dekId = doc.dekKeyId || `kms-dek-${doc.id}`;
          this.shredDEK(dekId);

          await db
            .update(schema.documents)
            .set({
              isShredded: true,
              shreddedAt: tombstonedAt,
              dekKeyId: dekId,
              shreddedReason: `KMS DEK revoked via User Tombstone (${reason})`,
            })
            .where(eq(schema.documents.id, doc.id));

          shreddedCount++;
        }
      }
    }

    // 4. Record Immutable Audit Log Entry for Regulatory Proof
    const sampleTxId = txIds[0] || null;
    if (sampleTxId) {
      await db.insert(schema.auditLogs).values({
        transactionId: sampleTxId,
        userId: user.id,
        actor,
        event: 'USER_TOMBSTONED_GDPR_PURGE',
        action: 'TOMBSTONE_AND_CRYPTO_SHRED',
        result: 'SUCCESS',
        metadata: {
          originalUserId: user.id,
          redactedIdentifier: redactedName,
          shreddedDocumentsCount: shreddedCount,
          statutoryFramework: 'GDPR Article 17 / DPDP Article 12',
          financialLedgerRetained: '7 Years Statutory Compliance',
          timestamp: tombstonedAt.toISOString(),
        },
      });
    }

    return {
      success: true,
      userId: user.id,
      redactedName,
      shreddedDocumentsCount: shreddedCount,
      tombstonedAt: tombstonedAt.toISOString(),
    };
  }
}
