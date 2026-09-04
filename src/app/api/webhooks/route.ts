import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';

const VALID_EVENTS = [
  'PO_CREATED', 'PO_RESERVED', 'VERIFICATION_STARTED', 'VERIFICATION_PASSED',
  'VERIFICATION_FAILED', 'PAYMENT_SETTLED', 'MILESTONE_SETTLED', 'AUTO_RELEASED',
  'AUTO_REFUNDED', 'MANUAL_REVIEW_TRIGGERED', 'CANCELLED', 'REFUNDED',
];

const createSchema = z.object({
  url: z.string().url('Must be a valid HTTPS URL'),
  events: z.array(z.string()).max(20).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const endpoints = await db.select().from(schema.webhookEndpoints).where(eq(schema.webhookEndpoints.ownerId, user.id));
    return Response.json({ endpoints: endpoints.map((e) => ({ ...e, secret: undefined })) });
  } catch (err) {
    console.error('Webhooks GET error:', err);
    return Response.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    const { url, events } = parsed.data;
    // Filter to valid events only
    const validEvents = events.filter((e) => VALID_EVENTS.includes(e));
    // Generate a random signing secret
    const secret = createHmac('sha256', Math.random().toString()).update(Date.now().toString()).digest('hex').slice(0, 32);
    const [endpoint] = await db.insert(schema.webhookEndpoints).values({
      ownerId: user.id,
      url,
      secret,
      events: validEvents,
      active: true,
    }).returning();
    return Response.json({ endpoint: { ...endpoint }, secret }, { status: 201 });
  } catch (err) {
    console.error('Webhooks POST error:', err);
    return Response.json({ error: 'Failed to create webhook' }, { status: 500 });
  }
}
