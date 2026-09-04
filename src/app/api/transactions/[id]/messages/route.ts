import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';

const bodySchema = z.object({ body: z.string().trim().min(1).max(4_000), flaggedCheck: z.string().trim().max(120).optional() });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;
  const [transaction] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
  if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });
  if (!canAccessTransaction(user, transaction)) return Response.json({ error: 'Not authorized' }, { status: 403 });

  // Join with users to get sender name and role
  const rawMessages = await db
    .select({
      id: schema.transactionMessages.id,
      transactionId: schema.transactionMessages.transactionId,
      userId: schema.transactionMessages.userId,
      flaggedCheck: schema.transactionMessages.flaggedCheck,
      body: schema.transactionMessages.body,
      createdAt: schema.transactionMessages.createdAt,
      senderName: schema.users.name,
      senderRole: schema.users.role,
    })
    .from(schema.transactionMessages)
    .leftJoin(schema.users, eq(schema.transactionMessages.userId, schema.users.id))
    .where(eq(schema.transactionMessages.transactionId, id))
    .orderBy(schema.transactionMessages.createdAt);

  return Response.json({ messages: rawMessages });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Message must be between 1 and 4,000 characters' }, { status: 400 });
    const { id } = await params;
    const [transaction] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (!canAccessTransaction(user, transaction)) return Response.json({ error: 'Not authorized' }, { status: 403 });
    const [message] = await db.insert(schema.transactionMessages).values({
      transactionId: id,
      userId: user.id,
      body: parsed.data.body,
      flaggedCheck: parsed.data.flaggedCheck,
    }).returning();
    await db.insert(schema.auditLogs).values({
      transactionId: id,
      userId: user.id,
      actor: user.email,
      event: 'CLARIFICATION_MESSAGE_POSTED',
      action: 'MESSAGE',
      result: 'SUCCESS',
      metadata: { flaggedCheck: parsed.data.flaggedCheck },
    });
    // Return message with sender info
    return Response.json({
      message: {
        ...message,
        senderName: user.name,
        senderRole: user.role,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Messages POST error:', error);
    return Response.json({ error: 'Failed to post message' }, { status: 500 });
  }
}
