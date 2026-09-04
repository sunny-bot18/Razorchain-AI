import { type NextRequest } from 'next/server';
import { hash, compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { signToken, getUser } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';

const SALT_ROUNDS = 10;

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return Response.json({ user });
  } catch (error) {
    console.error('Auth GET error:', error);
    return Response.json({ error: 'Failed to get user' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    const body = await request.json();
    const { email, password, action, name, company } = body;

    if (!email || !password || !action) {
      return Response.json(
        { error: 'Email, password, and action are required' },
        { status: 400 }
      );
    }

    if (action === 'register') {
      if (!name) {
        return Response.json(
          { error: 'Name is required for registration' },
          { status: 400 }
        );
      }

      const existingUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return Response.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }

      const passwordHash = await hash(password, SALT_ROUNDS);

      const [newUser] = await db
        .insert(schema.users)
        .values({
          email,
          name,
          company: company || null,
          // Public registration must never choose a privileged role.
          role: 'BUYER',
          passwordHash,
        })
        .returning({
          id: schema.users.id,
          email: schema.users.email,
          name: schema.users.name,
          company: schema.users.company,
          role: schema.users.role,
          createdAt: schema.users.createdAt,
          updatedAt: schema.users.updatedAt,
        });

      const token = signToken(newUser.id);

      const response = Response.json({ user: newUser }, { status: 201 });
      response.headers.set(
        'Set-Cookie',
        `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`
      );
      return response;
    }

    if (action === 'login') {
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (!user) {
        return Response.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      if (user.isTombstoned) {
        return Response.json(
          {
            error: 'Account Terminated: This account has been permanently tombstoned and personal data shredded under statutory Right to be Forgotten regulations.',
          },
          { status: 403 }
        );
      }

      const isValid = await compare(password, user.passwordHash);
      if (!isValid) {
        return Response.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const token = signToken(user.id);

      const userWithoutPassword = {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      const response = Response.json({ user: userWithoutPassword });
      response.headers.set(
        'Set-Cookie',
        `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`
      );
      return response;
    }

    return Response.json({ error: 'Invalid action. Must be "login" or "register"' }, { status: 400 });
  } catch (error) {
    console.error('Auth POST error:', error);
    return Response.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.set('Set-Cookie', 'auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return response;
}
