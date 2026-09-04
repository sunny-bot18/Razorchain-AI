import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import {
  getTransactionMerkleProof,
  anchorAuditBatch,
} from '@/lib/services/merkle-service';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const [tx] = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);

    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (!canAccessTransaction(user, tx)) return Response.json({ error: 'Not authorized' }, { status: 403 });

    // If transaction has no Merkle root yet, anchor an audit batch
    if (!tx.merkleRoot) {
      await anchorAuditBatch(50);
    }

    const proof = await getTransactionMerkleProof(id);
    if (!proof) {
      return Response.json({
        anchored: false,
        message: 'Transaction is pending batch inclusion in next on-chain Merkle block.',
      });
    }

    return Response.json({
      anchored: true,
      ...proof,
    });
  } catch (err) {
    console.error('Merkle proof GET error:', err);
    return Response.json({ error: 'Failed to retrieve Merkle audit proof' }, { status: 500 });
  }
}
