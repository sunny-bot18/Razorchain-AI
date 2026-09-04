import { type NextRequest } from 'next/server';
import { compare } from 'bcryptjs';
import { eq, or, and, notInArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';
import { CryptographicShreddingService } from '@/lib/services/cryptographic-shredding-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [userData] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        company: schema.users.company,
        role: schema.users.role,
        taxId: schema.users.taxId,
        isTombstoned: schema.users.isTombstoned,
        tombstonedAt: schema.users.tombstonedAt,
        tombstoneReason: schema.users.tombstoneReason,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    if (!userData) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Check Zero Balance / Active Escrow Status
    const activeTxns = await db
      .select({
        id: schema.transactions.id,
        transactionNumber: schema.transactions.transactionNumber,
        amount: schema.transactions.amount,
        status: schema.transactions.status,
        productDescription: schema.transactions.productDescription,
        createdAt: schema.transactions.createdAt,
      })
      .from(schema.transactions)
      .where(
        and(
          or(eq(schema.transactions.buyerId, user.id), eq(schema.transactions.sellerId, user.id)),
          notInArray(schema.transactions.status, ['SETTLED', 'CANCELLED', 'REFUNDED'])
        )
      );

    const allTxns = await db
      .select({
        id: schema.transactions.id,
      })
      .from(schema.transactions)
      .where(or(eq(schema.transactions.buyerId, user.id), eq(schema.transactions.sellerId, user.id)));

    const isEligibleForErasure = !userData.isTombstoned && activeTxns.length === 0;

    return Response.json({
      user: userData,
      erasureEligibility: {
        isEligible: isEligibleForErasure,
        isTombstoned: userData.isTombstoned,
        activeCount: activeTxns.length,
        activeTransactions: activeTxns,
        totalTransactionsCount: allTxns.length,
        reason: activeTxns.length > 0
          ? `Blocked by ${activeTxns.length} active escrow transaction(s). Escrows must reach terminal state (SETTLED, CANCELLED, REFUNDED) before data erasure.`
          : 'Eligible for GDPR Art 17 / DPDP Right to be Forgotten erasure.',
      },
    });
  } catch (error) {
    console.error('User ME GET error:', error);
    return Response.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Retrieve full user record with passwordHash for Step-Up Authentication
    const [fullUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    if (!fullUser) {
      return Response.json({ error: 'User record not found' }, { status: 404 });
    }

    if (fullUser.isTombstoned) {
      return Response.json(
        { error: 'Account has already been tombstoned and personal data shredded.' },
        { status: 400 }
      );
    }

    // Parse Step-Up Authentication Credentials
    let body: { password?: string; confirmationKeyword?: string; reason?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body empty
    }

    const { password, confirmationKeyword, reason } = body;

    // 1. Password Verification (Step-Up Authentication)
    if (!password) {
      return Response.json(
        { error: 'Step-up authentication required: Please enter your password to authorize account erasure.' },
        { status: 400 }
      );
    }

    const isPasswordValid = await compare(password, fullUser.passwordHash);
    if (!isPasswordValid) {
      return Response.json(
        { error: 'Step-up authentication failed: Invalid password entered.' },
        { status: 401 }
      );
    }

    // 2. High-Stakes Confirmation Phrase Verification
    const normalizedKeyword = (confirmationKeyword || '').trim().toUpperCase();
    const normalizedCompany = (fullUser.company || '').trim().toUpperCase();
    const isKeywordMatch =
      normalizedKeyword === 'ERASE MY DATA' ||
      (normalizedCompany.length > 0 && normalizedKeyword === normalizedCompany);

    if (!isKeywordMatch) {
      return Response.json(
        {
          error: `Confirmation mismatch: Please type "ERASE MY DATA"${
            fullUser.company ? ` or your company name "${fullUser.company}"` : ''
          } to confirm.`,
        },
        { status: 400 }
      );
    }

    // 3. Pre-Condition: The "Zero Balance" Rule (Ledger Check)
    const activeTxns = await db
      .select({
        id: schema.transactions.id,
        transactionNumber: schema.transactions.transactionNumber,
        amount: schema.transactions.amount,
        status: schema.transactions.status,
      })
      .from(schema.transactions)
      .where(
        and(
          or(eq(schema.transactions.buyerId, user.id), eq(schema.transactions.sellerId, user.id)),
          notInArray(schema.transactions.status, ['SETTLED', 'CANCELLED', 'REFUNDED'])
        )
      );

    if (activeTxns.length > 0) {
      return Response.json(
        {
          error: `Zero Balance Rule Violation: Cannot erase account data while ${activeTxns.length} active escrow transaction(s) exist. All escrows must reach a terminal state (SETTLED, CANCELLED, or REFUNDED) before personal data can be purged.`,
          activeTransactionsCount: activeTxns.length,
          activeTransactions: activeTxns,
        },
        { status: 409 }
      );
    }

    // 4. Execute Cryptographic Shredding & Tombstone
    const auditReason = reason || 'User self-service Right to be Forgotten (GDPR Art 17 / DPDP Act)';
    const result = await CryptographicShreddingService.executeUserTombstone(
      user.id,
      auditReason,
      fullUser.email
    );

    // 5. Session Kill (Clear auth-token HttpOnly Cookie)
    const response = Response.json({
      message: 'Account successfully tombstoned and cryptographic keys shredded. Statutory financial ledger preserved.',
      details: result,
    });

    response.headers.set(
      'Set-Cookie',
      'auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    );

    return response;
  } catch (error) {
    console.error('User ME DELETE / Tombstone error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to execute tombstone' },
      { status: 500 }
    );
  }
}
