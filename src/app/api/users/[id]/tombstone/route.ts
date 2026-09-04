import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { CryptographicShreddingService } from '@/lib/services/cryptographic-shredding-service';

const tombstoneSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters long').optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getUser(request);
    if (!admin) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (admin.role !== 'ADMIN') {
      return Response.json(
        { error: 'Forbidden: Only Compliance Officers and Admins can trigger user tombstoning' },
        { status: 403 }
      );
    }

    const { id } = await params;
    let reason = 'Admin/Compliance Officer Triggered Regulatory Tombstone';

    try {
      const body = await request.json();
      const parsed = tombstoneSchema.safeParse(body);
      if (parsed.success && parsed.data.reason) {
        reason = parsed.data.reason;
      }
    } catch {
      // Body optional
    }

    const result = await CryptographicShreddingService.executeUserTombstone(
      id,
      reason,
      admin.name || admin.email
    );

    return Response.json({
      message: `User ${id} successfully tombstoned. PII purged, DEKs revoked, and financial records preserved.`,
      result,
    });
  } catch (error) {
    console.error('Admin user tombstone error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to tombstone user' },
      { status: 500 }
    );
  }
}
