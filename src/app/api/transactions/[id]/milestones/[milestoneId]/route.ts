import { type NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

const approveSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  partialQuantity: z.number().int().positive().optional(),
  reason: z.string().trim().max(500).optional(),
  inspectionWindowHours: z.number().int().min(1).max(720).default(72),
});

type Params = { params: Promise<{ id: string; milestoneId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id, milestoneId } = await params;
    const tx = await findTransactionByIdOrNumber(id);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (!canAccessTransaction(user, tx)) return Response.json({ error: 'Not authorized' }, { status: 403 });
    const txUuid = tx.id;
    const [milestone] = await db.select().from(schema.paymentMilestones)
      .where(and(eq(schema.paymentMilestones.id, milestoneId), eq(schema.paymentMilestones.transactionId, txUuid)))
      .limit(1);
    if (!milestone) return Response.json({ error: 'Milestone not found' }, { status: 404 });
    return Response.json({ milestone });
  } catch (err) {
    console.error('Milestone GET error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to fetch milestone';
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id, milestoneId } = await params;
    const tx = await findTransactionByIdOrNumber(id);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (user.id !== tx.buyerId && user.role !== 'ADMIN') return Response.json({ error: 'Only buyer/admin can approve milestones' }, { status: 403 });
    const txUuid = tx.id;
    const [milestone] = await db.select().from(schema.paymentMilestones)
      .where(and(eq(schema.paymentMilestones.id, milestoneId), eq(schema.paymentMilestones.transactionId, txUuid)))
      .limit(1);
    if (!milestone) return Response.json({ error: 'Milestone not found' }, { status: 404 });
    if (!['VERIFYING', 'APPROVED', 'EVIDENCE_PENDING'].includes(milestone.status)) {
      return Response.json({ error: `Milestone cannot be actioned in status: ${milestone.status}` }, { status: 409 });
    }

    const parsed = approveSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    const { action, partialQuantity, reason, inspectionWindowHours } = parsed.data;

    if (action === 'APPROVE') {
      // Pro-rata: if partial quantity, compute partial amount
      const fulfilledQty = partialQuantity ?? tx.quantity;
      const proRataAmount = (fulfilledQty / tx.quantity) * milestone.amount;
      const autoReleaseAt = new Date(Date.now() + inspectionWindowHours * 60 * 60 * 1000);

      const [updated] = await db
        .update(schema.paymentMilestones)
        .set({
          status: 'APPROVED',
          fulfilledQuantity: fulfilledQty,
          inspectionDeadline: autoReleaseAt,
          autoReleaseAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.paymentMilestones.id, milestoneId))
        .returning();

      // If partial, mark transaction partial settlement approved
      if (partialQuantity && partialQuantity < tx.quantity) {
        await db.update(schema.transactions).set({
          partialQuantityShipped: partialQuantity,
          partialSettlementApproved: true,
          updatedAt: new Date(),
        }).where(eq(schema.transactions.id, txUuid));
      }

      await db.insert(schema.auditLogs).values({
        transactionId: txUuid,
        userId: user.id,
        actor: user.email,
        event: 'MILESTONE_APPROVED',
        action: 'APPROVE_MILESTONE',
        result: 'SUCCESS',
        metadata: { milestoneId, label: milestone.label, fulfilledQty, proRataAmount, autoReleaseAt: autoReleaseAt.toISOString() },
      });
      return Response.json({ milestone: updated });
    }

    // REJECT
    const [updated] = await db
      .update(schema.paymentMilestones)
      .set({ status: 'REJECTED', updatedAt: new Date() })
      .where(eq(schema.paymentMilestones.id, milestoneId))
      .returning();

    await db.insert(schema.auditLogs).values({
      transactionId: txUuid,
      userId: user.id,
      actor: user.email,
      event: 'MILESTONE_REJECTED',
      action: 'REJECT_MILESTONE',
      result: 'SUCCESS',
      metadata: { milestoneId, label: milestone.label, reason },
    });
    return Response.json({ milestone: updated });
  } catch (err) {
    console.error('Milestone POST error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to action milestone';
    return Response.json({ error: msg }, { status: 500 });
  }
}
