import { type NextRequest } from 'next/server';
import { count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';

const schemaBody = z.object({ role: z.enum(['BUYER', 'SELLER', 'ADMIN']) });

/** Changes a role through an admin-only, audited control plane. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getUser(request);
    if (!actor) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    if (actor.role !== 'ADMIN') return Response.json({ error: 'Administrator access required' }, { status: 403 });
    const parsed = schemaBody.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: 'Choose a valid role' }, { status: 400 });
    const { id } = await params;
    if (id === actor.id) return Response.json({ error: 'Administrators cannot change their own role' }, { status: 400 });
    const [target] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });
    if (target.role === parsed.data.role) return Response.json({ user: { id: target.id, role: target.role } });
    if (target.role === 'ADMIN' && parsed.data.role !== 'ADMIN') {
      const [{ value: adminCount }] = await db.select({ value: count() }).from(schema.users).where(eq(schema.users.role, 'ADMIN'));
      if (Number(adminCount) <= 1) return Response.json({ error: 'At least one administrator must remain' }, { status: 409 });
    }
    const [updated] = await db.update(schema.users).set({ role: parsed.data.role, updatedAt: new Date() }).where(eq(schema.users.id, id)).returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role });
    await db.insert(schema.auditLogs).values({ transactionId: null, userId: actor.id, actor: actor.email, event: 'USER_ROLE_CHANGED', action: 'ROLE_CHANGE', result: 'SUCCESS', metadata: { targetUserId: target.id, targetEmail: target.email, from: target.role, to: parsed.data.role } });
    return Response.json({ user: updated });
  } catch (error) {
    console.error('Role POST error:', error);
    return Response.json({ error: 'Failed to change user role' }, { status: 500 });
  }
}
