import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { disburseFactoringAdvance } from '@/lib/services/factoring-service';

const disburseSchema = z.object({
  pledgeId: z.string().uuid(),
  utrNumber: z.string().trim().min(4).max(64),
  disbursedAmount: z.number().positive().optional(),
  lienReference: z.string().trim().min(3).max(64).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = disburseSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid disbursement request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { pledgeId, utrNumber, disbursedAmount, lienReference } = parsed.data;

    const updated = await disburseFactoringAdvance(pledgeId, {
      utrNumber,
      disbursedAmount,
      lienReference,
      actor: user.email,
    });

    return Response.json({
      success: true,
      pledge: updated,
      message: `Advance disbursed. UTR: ${utrNumber}. Legal lien ${updated.lienReference} recorded on transaction.`,
    });
  } catch (err: any) {
    console.error('Factoring disburse error:', err);
    return Response.json({ error: err.message || 'Failed to disburse advance' }, { status: 400 });
  }
}
