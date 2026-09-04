import { type NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser, canAccessTransaction } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const transaction = await findTransactionByIdOrNumber(id);

    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!canAccessTransaction(user, transaction)) {
      return Response.json({ error: 'Not authorized for this transaction' }, { status: 403 });
    }

    const txUuid = transaction.id;

    const auditLogs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.transactionId, txUuid))
      .orderBy(desc(schema.auditLogs.timestamp));

    return Response.json({ auditLogs });
  } catch (error) {
    console.error('Audit GET error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    return Response.json({ error: msg }, { status: 500 });
  }
}
