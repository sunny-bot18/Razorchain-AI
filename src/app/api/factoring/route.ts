import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import {
  verifyEscrowCollateral,
  pledgeTransactionForFactoring,
} from '@/lib/services/factoring-service';

const pledgeSchema = z.object({
  transactionId: z.string().uuid(),
  lenderId: z.string().trim().min(2),
  lenderName: z.string().trim().min(2),
  advancePercentage: z.number().min(50).max(95).default(85),
  discountFeePercentage: z.number().min(0.5).max(10).default(2.5),
});

export async function GET(request: NextRequest) {
  try {
    const txId = request.nextUrl.searchParams.get('txId');
    if (!txId) {
      return Response.json({ error: 'txId parameter is required' }, { status: 400 });
    }

    const verification = await verifyEscrowCollateral(txId);
    if (!verification) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return Response.json({ collateral: verification });
  } catch (err) {
    console.error('Factoring GET error:', err);
    return Response.json({ error: 'Failed to verify escrow collateral' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const parsed = pledgeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid pledge request', details: parsed.error.flatten() }, { status: 400 });
    }

    const pledge = await pledgeTransactionForFactoring(parsed.data);
    return Response.json({
      success: true,
      pledge,
      message: `Transaction pledged to ${parsed.data.lenderName}. Advance amount: ₹${pledge.advanceAmount.toLocaleString('en-IN')}.`,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Factoring POST error:', err);
    return Response.json({ error: err.message || 'Failed to pledge transaction' }, { status: 400 });
  }
}
