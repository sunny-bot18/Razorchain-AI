import { type NextRequest } from 'next/server';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { generateSettlementCertificate } from '@/lib/services/certificate-service';
import { generateSettlementCertificatePdf } from '@/lib/services/pdf-certificate-service';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    const { id } = await params;
    const tx = await findTransactionByIdOrNumber(id);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    if (!canAccessTransaction(user, tx)) return Response.json({ error: 'Not authorized' }, { status: 403 });
    if (tx.status !== 'SETTLED') {
      return Response.json({ error: 'Settlement certificate is only available for SETTLED transactions' }, { status: 409 });
    }
    const certificate = await generateSettlementCertificate(tx.id);
    if (!certificate) return Response.json({ error: 'Failed to generate certificate: Transaction data incomplete' }, { status: 500 });

    const format = request.nextUrl.searchParams.get('format') || 'pdf';

    if (format === 'json') {
      return new Response(JSON.stringify(certificate, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="razorchain-certificate-${tx.transactionNumber}.json"`,
        },
      });
    }

    // Default: Return official styled PDF binary stream
    const pdfBytes = generateSettlementCertificatePdf(certificate);
    return new Response(pdfBytes as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="razorchain-settlement-certificate-${tx.transactionNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error('Certificate GET error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate certificate';
    return Response.json({ error: `Failed to generate certificate: ${msg}` }, { status: 500 });
  }
}
