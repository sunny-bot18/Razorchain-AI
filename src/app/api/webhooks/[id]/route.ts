import { type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';

const patchSchema = z.object({
  active: z.boolean().optional(),
  events: z.array(z.string()).max(20).optional(),
  url: z.string().url().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const [endpoint] = await db.select().from(schema.webhookEndpoints).where(and(eq(schema.webhookEndpoints.id, id), eq(schema.webhookEndpoints.ownerId, user.id))).limit(1);
    if (!endpoint) return Response.json({ error: 'Webhook endpoint not found' }, { status: 404 });
    await db.delete(schema.webhookEndpoints).where(eq(schema.webhookEndpoints.id, id));
    return Response.json({ success: true });
  } catch (err) {
    console.error('Webhook DELETE error:', err);
    return Response.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    const [endpoint] = await db.select().from(schema.webhookEndpoints).where(and(eq(schema.webhookEndpoints.id, id), eq(schema.webhookEndpoints.ownerId, user.id))).limit(1);
    if (!endpoint) return Response.json({ error: 'Webhook endpoint not found' }, { status: 404 });
    const [updated] = await db.update(schema.webhookEndpoints)
      .set({ ...parsed.data })
      .where(eq(schema.webhookEndpoints.id, id))
      .returning();
    return Response.json({ endpoint: { ...updated, secret: undefined } });
  } catch (err) {
    console.error('Webhook PATCH error:', err);
    return Response.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}
