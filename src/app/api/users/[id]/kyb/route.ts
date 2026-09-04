import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';
import { verifyCorporateAndUBO } from '@/lib/services/kyb-service';

const uboSchema = z.object({
  name: z.string().trim().min(2),
  equityPercentage: z.number().min(1).max(100),
  nationality: z.string().trim().min(2),
  isPep: z.boolean().optional().default(false),
  passportOrNationalId: z.string().trim().optional(),
});

const corporateKybSchema = z.object({
  companyName: z.string().trim().min(2),
  taxId: z.string().trim().min(5),
  registrationNumber: z.string().trim().optional(),
  jurisdiction: z.string().trim().default('IN'),
  ubos: z.array(uboSchema).min(1, 'At least one Ultimate Beneficial Owner (>25%) must be declared'),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    // Users can only submit KYB for themselves, unless ADMIN
    if (user.id !== id && user.role !== 'ADMIN') {
      return Response.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = corporateKybSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid KYB submission', details: parsed.error.flatten() }, { status: 400 });
    }

    const kybResult = await verifyCorporateAndUBO(parsed.data);
    const newKybStatus = kybResult.cleared ? 'CLEARED' : 'FLAGGED';

    await db
      .update(schema.users)
      .set({
        taxId: parsed.data.taxId,
        company: parsed.data.companyName,
        kybStatus: newKybStatus,
        kybClearedAt: kybResult.cleared ? new Date() : null,
        uboDetails: parsed.data.ubos as unknown as Record<string, unknown>,
        corporateRegistration: {
          registrationNumber: parsed.data.registrationNumber,
          jurisdiction: parsed.data.jurisdiction,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id));

    await db.insert(schema.auditLogs).values({
      userId: id,
      actor: user.email,
      event: 'KYB_UBO_VERIFIED',
      action: 'KYB_VERIFY',
      result: newKybStatus,
      metadata: {
        companyName: parsed.data.companyName,
        uboCount: kybResult.uboCount,
        cleared: kybResult.cleared,
        flags: kybResult.flags,
      },
    });

    return Response.json({
      success: true,
      kybStatus: newKybStatus,
      result: kybResult,
    });
  } catch (err) {
    console.error('KYB POST error:', err);
    return Response.json({ error: 'Failed to process corporate KYB verification' }, { status: 500 });
  }
}
