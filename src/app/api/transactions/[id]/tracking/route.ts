import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { carrierService, type CarrierCode } from '@/lib/services/carrier-service';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

const submitSchema = z.object({
  trackingNumber: z.string().trim().min(3).max(100),
  carrier: z.enum(['FEDEX', 'DHL', 'BLUEDART', 'DELHIVERY', 'OTHER']),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const tx = await findTransactionByIdOrNumber(id);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (!canAccessTransaction(user, tx)) return Response.json({ error: 'Not authorized' }, { status: 403 });
    if (!tx.trackingNumber || !tx.carrier) {
      return Response.json({ tracking: null, message: 'No tracking number registered for this transaction' });
    }
    const txUuid = tx.id;
    const tracking = await carrierService.track(tx.carrier as CarrierCode, tx.trackingNumber);
    // Update carrier status in DB
    await db.update(schema.transactions).set({
      carrierStatus: tracking.status,
      carrierVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(schema.transactions.id, txUuid));
    return Response.json({ tracking, carrier: tx.carrier, awb: tx.trackingNumber });
  } catch (err) {
    console.error('Tracking GET error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to fetch tracking';
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const tx = await findTransactionByIdOrNumber(id);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (user.role !== 'ADMIN' && user.role !== 'SELLER' && user.id !== tx.sellerId) {
      return Response.json({ error: 'Only sellers or administrators can submit tracking' }, { status: 403 });
    }
    if (!['FUNDS_RESERVED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING'].includes(tx.status)) {
      return Response.json({ error: `Cannot add tracking while transaction is ${tx.status}` }, { status: 409 });
    }
    const txUuid = tx.id;
    if (user.role === 'SELLER' && tx.sellerId !== user.id) {
      try {
        await db.update(schema.transactions).set({ sellerId: user.id, updatedAt: new Date() }).where(eq(schema.transactions.id, txUuid));
        tx.sellerId = user.id;
      } catch (err) {
        console.warn('[tracking POST] Failed to update sellerId (non-fatal):', err);
      }
    }
    const parsed = submitSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    const { trackingNumber, carrier } = parsed.data;
    await db.update(schema.transactions).set({
      trackingNumber,
      carrier,
      updatedAt: new Date(),
    }).where(eq(schema.transactions.id, txUuid));
    await db.insert(schema.auditLogs).values({
      transactionId: txUuid,
      userId: user.id,
      actor: user.email,
      event: 'TRACKING_SUBMITTED',
      action: 'SUBMIT_TRACKING',
      result: 'SUCCESS',
      metadata: { trackingNumber, carrier },
    });
    // Return initial tracking status
    const tracking = await carrierService.track(carrier as CarrierCode, trackingNumber);
    return Response.json({ tracking, trackingNumber, carrier }, { status: 201 });
  } catch (err) {
    console.error('Tracking POST error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to submit tracking';
    return Response.json({ error: msg }, { status: 500 });
  }
}
