import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { carrierService, type CarrierCode } from '@/lib/services/carrier-service';

const submitSchema = z.object({
  trackingNumber: z.string().trim().min(3).max(100),
  carrier: z.enum(['FEDEX', 'DHL', 'BLUEDART', 'DELHIVERY', 'OTHER']),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const [tx] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (!canAccessTransaction(user, tx)) return Response.json({ error: 'Not authorized' }, { status: 403 });
    if (!tx.trackingNumber || !tx.carrier) {
      return Response.json({ tracking: null, message: 'No tracking number registered for this transaction' });
    }
    const tracking = await carrierService.track(tx.carrier as CarrierCode, tx.trackingNumber);
    // Update carrier status in DB
    await db.update(schema.transactions).set({
      carrierStatus: tracking.status,
      carrierVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(schema.transactions.id, id));
    return Response.json({ tracking, carrier: tx.carrier, awb: tx.trackingNumber });
  } catch (err) {
    console.error('Tracking GET error:', err);
    return Response.json({ error: 'Failed to fetch tracking' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const [tx] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (user.id !== tx.sellerId && user.role !== 'ADMIN') return Response.json({ error: 'Only seller can submit tracking' }, { status: 403 });
    if (!['FUNDS_RESERVED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING'].includes(tx.status)) {
      return Response.json({ error: `Cannot add tracking while transaction is ${tx.status}` }, { status: 409 });
    }
    const parsed = submitSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    const { trackingNumber, carrier } = parsed.data;
    await db.update(schema.transactions).set({
      trackingNumber,
      carrier,
      updatedAt: new Date(),
    }).where(eq(schema.transactions.id, id));
    await db.insert(schema.auditLogs).values({
      transactionId: id,
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
    return Response.json({ error: 'Failed to submit tracking' }, { status: 500 });
  }
}
