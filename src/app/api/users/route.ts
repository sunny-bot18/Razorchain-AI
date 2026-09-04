import { type NextRequest } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const roleParam = request.nextUrl.searchParams.get('role');
    if (roleParam && roleParam !== 'SELLER' && roleParam !== 'BUYER' && roleParam !== 'ADMIN') {
      return Response.json({ error: 'Invalid role filter' }, { status: 400 });
    }
    const role = roleParam as 'BUYER' | 'SELLER' | 'ADMIN' | null;
    // Buyers need a seller directory to create a PO, but must not enumerate
    // other accounts. Full user management is admin-only.
    if (user.role !== 'ADMIN' && (user.role !== 'BUYER' || role !== 'SELLER')) {
      return Response.json({ error: 'Not authorized to list users' }, { status: 403 });
    }

    const query = db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        company: schema.users.company,
        role: schema.users.role,
        isTombstoned: schema.users.isTombstoned,
        tombstonedAt: schema.users.tombstonedAt,
      })
      .from(schema.users);
    const users = role
      ? await query.where(eq(schema.users.role, role)).orderBy(asc(schema.users.name))
      : await query.orderBy(asc(schema.users.name));

    return Response.json({ users });
  } catch (error) {
    console.error('Users GET error:', error);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
