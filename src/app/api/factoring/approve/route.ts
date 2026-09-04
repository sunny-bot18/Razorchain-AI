import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { approveFactoringPledge } from '@/lib/services/factoring-service';

const approveSchema = z.object({
  pledgeId: z.string().uuid(),
  approvedAmount: z.number().positive().optional(),
  discountFeePercentage: z.number().positive().max(20).optional(),
  remarks: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid approval request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { pledgeId, approvedAmount, discountFeePercentage, remarks } = parsed.data;
    const discountFee = (approvedAmount && discountFeePercentage) 
      ? Math.round((approvedAmount * (discountFeePercentage / 100)) * 100) / 100 
      : undefined;

    const updated = await approveFactoringPledge(pledgeId, {
      approvedAmount,
      discountFee,
      remarks,
      actor: user.email,
    });

    return Response.json({
      success: true,
      pledge: updated,
      message: `Pledge ${pledgeId} approved with advance amount ₹${updated.advanceAmount.toLocaleString('en-IN')}. Capital committed.`,
    });
  } catch (err: any) {
    console.error('Factoring approve error:', err);
    return Response.json({ error: err.message || 'Failed to approve factoring pledge' }, { status: 400 });
  }
}
