import { type NextRequest } from 'next/server';
import { getUser } from '@/lib/auth';
import { getLenderPortfolio } from '@/lib/services/factoring-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const lenderId = request.nextUrl.searchParams.get('lenderId') || undefined;
    const portfolio = await getLenderPortfolio(lenderId);

    return Response.json({
      portfolio,
      lenderId: lenderId ?? 'ALL_PORTFOLIO',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Lender portfolio GET error:', err);
    return Response.json({ error: err.message || 'Failed to fetch lender portfolio' }, { status: 500 });
  }
}
