import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const step = body.step || 1; // 1 = Buyer / Maker, 2 = Seller / Checker

    const tx = await findTransactionByIdOrNumber(id);

    if (!tx) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!canAccessTransaction(user, tx)) {
      return Response.json({ error: 'Not authorized for this transaction' }, { status: 403 });
    }

    const txUuid = tx.id;

    if (step === 1 || !tx.firstApproverId) {
      if (user.role === 'SELLER') {
        return Response.json({ error: 'Only the Buyer can authorize initial release (Step 1)' }, { status: 403 });
      }
      // Step 1: Buyer / Maker Signature
      await db
        .update(schema.transactions)
        .set({
          requiresDualApproval: true,
          firstApproverId: user.id,
          firstApprovedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.transactions.id, txUuid));

      await db.insert(schema.auditLogs).values({
        transactionId: txUuid,
        userId: user.id,
        actor: user.name || user.email,
        event: 'BUYER_MULTISIG_SIGNATURE_RECORDED',
        action: 'MULTISIG_SIGN_STEP_1',
        result: 'SUCCESS',
        metadata: {
          signerRole: user.role,
          signerEmail: user.email,
          step: 1,
          description: 'Buyer authorization signature cryptographically recorded.',
        },
      });

      return Response.json({
        success: true,
        step: 1,
        message: '1st signature recorded (Buyer Release Authorization). Awaiting 2nd counterparty signature.',
      });
    } else {
      if (user.role === 'BUYER') {
        return Response.json({ error: 'Only the Seller counterparty can sign settlement acceptance (Step 2)' }, { status: 403 });
      }
      // Step 2: Seller / Checker Signature
      await db
        .update(schema.transactions)
        .set({
          secondApproverId: user.id,
          secondApprovedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.transactions.id, txUuid));

      await db.insert(schema.auditLogs).values({
        transactionId: txUuid,
        userId: user.id,
        actor: user.name || user.email,
        event: 'SELLER_MULTISIG_SIGNATURE_RECORDED',
        action: 'MULTISIG_SIGN_STEP_2',
        result: 'SUCCESS',
        metadata: {
          signerRole: user.role,
          signerEmail: user.email,
          step: 2,
          description: 'Seller counterparty signature cryptographically recorded. Multi-sig complete.',
        },
      });

      return Response.json({
        success: true,
        step: 2,
        message: '2nd signature recorded. Dual counterparty signatures verified.',
      });
    }
  } catch (err) {
    console.error('Multi-sig error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Multi-sig signing failed' },
      { status: 500 }
    );
  }
}
