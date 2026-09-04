import { type NextRequest } from 'next/server';
import { checkAndFireTimers } from '@/lib/services/escrow-timer';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret-change-in-production';

export async function POST(request: NextRequest) {
  // Validate cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  const secret = authHeader?.replace('Bearer ', '').trim();
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkAndFireTimers();
    console.log('[CronJob] Escrow timers fired:', result);
    return Response.json({
      success: true,
      ...result,
      firedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[CronJob] Escrow timers error:', err);
    return Response.json({ error: 'Cron job failed', details: String(err) }, { status: 500 });
  }
}

// Also allow GET for Vercel Cron (which sends GET requests)
export async function GET(request: NextRequest) {
  return POST(request);
}
