import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { calculateDynamicDiscount } from '@/lib/services/dynamic-discount-service';

const actionSchema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE']),
});

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

    const calc = calculateDynamicDiscount(tx.amount, tx.expectedDeliveryDate, new Date());

    return Response.json({
      ...calc,
      offered: tx.dynamicDiscountOffered,
      accepted: tx.dynamicDiscountAccepted,
      currentDiscountRate: tx.dynamicDiscountRate,
      currentDiscountAmount: tx.dynamicDiscountAmount,
    });
  } catch (err) {
    console.error('Dynamic discount GET error:', err);
    return Response.json({ error: 'Failed to fetch dynamic discount quote' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
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
    if (user.id !== tx.buyerId && user.role !== 'ADMIN') {
      return Response.json({ error: 'Only the buyer or admin can accept early discount' }, { status: 403 });
    }

    const parsed = actionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: 'Action must be ACCEPT or DECLINE' }, { status: 400 });

    const calc = calculateDynamicDiscount(tx.amount, tx.expectedDeliveryDate, new Date());
    const isAccepting = parsed.data.action === 'ACCEPT';

    await db
      .update(schema.transactions)
      .set({
        dynamicDiscountAccepted: isAccepting,
        dynamicDiscountOffered: true,
        dynamicDiscountRate: isAccepting ? calc.discountRate : 0,
        dynamicDiscountAmount: isAccepting ? calc.discountAmount : 0,
        updatedAt: new Date(),
      })
      .where(eq(schema.transactions.id, id));

    await db.insert(schema.auditLogs).values({
      transactionId: id,
      userId: user.id,
      actor: user.email,
      event: isAccepting ? 'DYNAMIC_DISCOUNT_ACCEPTED' : 'DYNAMIC_DISCOUNT_DECLINED',
      action: isAccepting ? 'ACCEPT_DISCOUNT' : 'DECLINE_DISCOUNT',
      result: 'SUCCESS',
      metadata: {
        action: parsed.data.action,
        discountRate: calc.discountRate,
        discountAmount: calc.discountAmount,
        netPayableAmount: calc.netPayableAmount,
      },
    });

    return Response.json({
      success: true,
      accepted: isAccepting,
      discountAmount: isAccepting ? calc.discountAmount : 0,
      netPayableAmount: isAccepting ? calc.netPayableAmount : tx.amount,
    });
  } catch (err) {
    console.error('Dynamic discount POST error:', err);
    return Response.json({ error: 'Failed to process dynamic discount decision' }, { status: 500 });
  }
}
