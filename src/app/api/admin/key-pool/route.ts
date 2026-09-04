import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { geminiKeyPool } from '@/lib/services/gemini-key-pool';

const addKeySchema = z.object({
  apiKey: z.string().trim().min(10).max(128),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const poolStatus = geminiKeyPool.getPoolStatus();
    return Response.json({
      pool: poolStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Key pool GET error:', err);
    return Response.json({ error: err.message || 'Failed to fetch key pool status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return Response.json({ error: 'Only administrators can manage the API key pool' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = addKeySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid API key format', details: parsed.error.flatten() }, { status: 400 });
    }

    const added = geminiKeyPool.addKey(parsed.data.apiKey);
    const poolStatus = geminiKeyPool.getPoolStatus();

    return Response.json({
      success: true,
      added,
      message: added
        ? 'New API key successfully registered in load balancing pool.'
        : 'API key already exists in active pool.',
      pool: poolStatus,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Key pool POST error:', err);
    return Response.json({ error: err.message || 'Failed to register API key' }, { status: 500 });
  }
}
