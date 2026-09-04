import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { generateAuditDossierPdf } from '@/lib/services/pdf-certificate-service';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

type Params = { params: Promise<{ id: string }> };

function toIsoSafe(dateVal: unknown): string {
  if (!dateVal) return new Date().toISOString();
  if (dateVal instanceof Date) return dateVal.toISOString();
  if (typeof dateVal === 'string') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? dateVal : d.toISOString();
  }
  return new Date().toISOString();
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const tx = await findTransactionByIdOrNumber(id);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (!canAccessTransaction(user, tx)) return Response.json({ error: 'Not authorized' }, { status: 403 });

    const txUuid = tx.id;

    const auditLogs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.transactionId, txUuid))
      .orderBy(schema.auditLogs.timestamp)
      .catch(() => []);

    const auditData = {
      transactionNumber: tx.transactionNumber,
      transactionId: tx.id,
      merkleRoot: (tx as unknown as { merkleRoot?: string }).merkleRoot || '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      generatedAt: new Date().toISOString(),
      auditTrail: auditLogs.map((l) => ({
        timestamp: toIsoSafe(l.timestamp),
        actor: l.actor,
        event: l.event,
        action: l.action,
        result: l.result,
        stateSnapshot: {
          status: tx.status,
          amount: tx.amount,
        },
      })),
    };

    const pdfBytes = generateAuditDossierPdf(auditData);
    return new Response(pdfBytes as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="razorchain-audit-dossier-${tx.transactionNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error('Audit PDF error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate audit PDF';
    return Response.json({ error: `Failed to generate audit PDF: ${msg}` }, { status: 500 });
  }
}
