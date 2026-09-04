import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';

const vanRequestSchema = z.object({
  partnerBank: z.enum(['AXIS', 'YES_BANK', 'HDFC', 'ICICI']).default('AXIS'),
  expiresHours: z.number().int().min(1).max(720).default(168),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const [tx] = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);

    if (!tx) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!canAccessTransaction(user, tx)) {
      return Response.json({ error: 'Not authorized for this transaction' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = vanRequestSchema.safeParse(body);
    const { partnerBank, expiresHours } = parsed.success ? parsed.data : { partnerBank: 'AXIS', expiresHours: 168 };

    const existing = tx.virtualAccount as Record<string, unknown> | null;
    if (existing && existing.status === 'ACTIVE' && new Date(existing.expiresAt as string) > new Date()) {
      return Response.json({
        virtualAccount: existing,
        message: 'Active Virtual Account retrieved',
      });
    }

    const hash = createHash('sha256').update(`${tx.id}:${Date.now()}`).digest('hex').toUpperCase();
    const vanSuffix = hash.slice(0, 8);
    const accountNumber = `RAZR${vanSuffix}`;
    const ifsc = partnerBank === 'YES_BANK' ? 'YESB0CMSNOC' : partnerBank === 'HDFC' ? 'HDFC0000060' : 'UTIB0CCH274';
    const bankName = partnerBank === 'YES_BANK' ? 'Yes Bank Enterprise CMS' : partnerBank === 'HDFC' ? 'HDFC Bank Corporate CMS' : 'Axis Bank Treasury Escrow';
    const beneficiaryName = `RazorChain Escrow — PO ${tx.poNumber}`;
    const expiresAt = new Date(Date.now() + expiresHours * 3600 * 1000).toISOString();

    const virtualAccountData = {
      accountNumber,
      ifsc,
      bankName,
      beneficiaryName,
      currency: tx.currency || 'INR',
      expectedAmount: tx.amount,
      status: 'ACTIVE',
      paymentRail: 'NEFT / RTGS / IMPS',
      createdAt: new Date().toISOString(),
      expiresAt,
      instructions: `Initiate an enterprise NEFT/RTGS wire of ₹${tx.amount.toLocaleString('en-IN')} to Account Number ${accountNumber}, IFSC ${ifsc}. Funds will be automatically credited to Escrow within 15 minutes of banking clearance.`,
    };

    await db
      .update(schema.transactions)
      .set({
        virtualAccount: virtualAccountData,
        updatedAt: new Date(),
      })
      .where(eq(schema.transactions.id, id));

    await db.insert(schema.auditLogs).values({
      transactionId: id,
      userId: user.id,
      actor: user.email,
      event: 'VIRTUAL_ACCOUNT_GENERATED',
      action: 'GENERATE_VAN',
      result: 'SUCCESS',
      metadata: {
        accountNumber,
        ifsc,
        bankName,
        expectedAmount: tx.amount,
      },
    });

    return Response.json({
      success: true,
      virtualAccount: virtualAccountData,
      message: `Dedicated NEFT/RTGS Virtual Account generated for PO ${tx.poNumber}.`,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Virtual account POST error:', err);
    return Response.json({ error: err.message || 'Failed to generate virtual account' }, { status: 500 });
  }
}
