import { sign, verify } from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

const SECRET = process.env.NEXTAUTH_SECRET || 'razorchain-dev-secret-change-in-production';

export interface TokenPayload {
  userId: string;
}

export function signToken(userId: string): string {
  return sign({ userId } as TokenPayload, SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = verify(token, SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      company: schema.users.company,
      role: schema.users.role,
      isTombstoned: schema.users.isTombstoned,
      createdAt: schema.users.createdAt,
      updatedAt: schema.users.updatedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, payload.userId))
    .limit(1);

  if (!user || user.isTombstoned) return null;

  return user;
}

/** Return whether a user can read or act on a transaction. */
export function canAccessTransaction(
  user: { id: string; role: string },
  transaction: { buyerId: string; sellerId: string },
) {
  return user.role === 'ADMIN' || user.id === transaction.buyerId || user.id === transaction.sellerId;
}
