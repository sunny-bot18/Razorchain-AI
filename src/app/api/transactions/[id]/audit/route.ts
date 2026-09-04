import { type NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const [transaction] = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);

    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const auditLogs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.transactionId, id))
      .orderBy(desc(schema.auditLogs.timestamp));

    return Response.json({ auditLogs });
  } catch (error) {
    console.error('Audit GET error:', error);
    return Response.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
