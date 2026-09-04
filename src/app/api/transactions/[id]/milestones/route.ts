import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

const milestoneSchema = z.object({ label: z.string().trim().min(2).max(120), percentage: z.number().positive().max(100), requiredDocuments: z.array(z.string().trim().min(1)).max(10).default([]) });
const bodySchema = z.object({ milestones: z.array(milestoneSchema).min(1).max(10), inspectionWindowHours: z.number().int().min(1).max(720).default(72) });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseInitialized();
    const user = await getUser(request); if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params; const transaction = await findTransactionByIdOrNumber(id);
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (!canAccessTransaction(user, transaction)) return Response.json({ error: 'Not authorized' }, { status: 403 });
    const txUuid = transaction.id;
    return Response.json({ milestones: await db.select().from(schema.paymentMilestones).where(eq(schema.paymentMilestones.transactionId, txUuid)).orderBy(schema.paymentMilestones.sequence) });
  } catch (error) {
    console.error('Milestones GET error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch milestones';
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseInitialized();
    const user = await getUser(request); if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const parsed = bodySchema.safeParse(await request.json()); if (!parsed.success) return Response.json({ error: 'Invalid milestone plan', details: parsed.error.flatten() }, { status: 400 });
    const { id } = await params; const transaction = await findTransactionByIdOrNumber(id);
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (user.id !== transaction.buyerId) return Response.json({ error: 'Only the buyer can define milestones' }, { status: 403 });
    if (transaction.status !== 'CREATED') return Response.json({ error: 'Milestones can only be defined before funds are reserved' }, { status: 409 });
    const total = parsed.data.milestones.reduce((sum, milestone) => sum + milestone.percentage, 0);
    if (Math.abs(total - 100) > 0.001) return Response.json({ error: 'Milestone percentages must total exactly 100%' }, { status: 400 });
    const txUuid = transaction.id;
    const existing = await db.select({ id: schema.paymentMilestones.id }).from(schema.paymentMilestones).where(eq(schema.paymentMilestones.transactionId, txUuid));
    if (existing.length) return Response.json({ error: 'Milestones are already defined for this transaction' }, { status: 409 });
    const milestones = await db.insert(schema.paymentMilestones).values(parsed.data.milestones.map((milestone, index) => {
      const status: 'EVIDENCE_PENDING' | 'PENDING' = index === 0 ? 'EVIDENCE_PENDING' : 'PENDING';
      return { transactionId: txUuid, sequence: index + 1, label: milestone.label, percentage: milestone.percentage, amount: transaction.amount * milestone.percentage / 100, requiredDocuments: milestone.requiredDocuments, status };
    })).returning();
    await db.insert(schema.auditLogs).values({ transactionId: txUuid, userId: user.id, actor: user.email, event: 'MILESTONES_DEFINED', action: 'CREATE', result: 'SUCCESS', metadata: { milestones: milestones.map(({ label, percentage, amount }) => ({ label, percentage, amount })), inspectionWindowHours: parsed.data.inspectionWindowHours } });
    return Response.json({ milestones }, { status: 201 });
  } catch (error) {
    console.error('Milestones POST error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to define milestones';
    return Response.json({ error: msg }, { status: 500 });
  }
}
