import { type NextRequest } from 'next/server';
import { anchorAuditBatch } from '@/lib/services/merkle-service';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow local development and testing
      if (process.env.NODE_ENV === 'production') {
        return Response.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const maxBatchSize = body.maxBatchSize || 50;

    const batch = await anchorAuditBatch(maxBatchSize);

    if (!batch) {
      return Response.json({
        anchored: false,
        message: 'No unanchored transactions pending in audit pipeline',
        timestamp: new Date().toISOString(),
      });
    }

    // Insert platform audit log
    await db.insert(schema.auditLogs).values({
      actor: 'system:cron:merkle-anchor',
      event: 'MERKLE_BATCH_ANCHORED',
      action: 'ANCHOR_LEDGER',
      result: 'SUCCESS',
      metadata: {
        batchId: batch.batchId,
        root: batch.root,
        leafCount: batch.leafCount,
        chain: 'POLYGON',
        txHash: batch.txHash,
        blockNumber: batch.blockNumber,
      },
    });

    return Response.json({
      anchored: true,
      batch: {
        batchId: batch.batchId,
        root: batch.root,
        leafCount: batch.leafCount,
        chain: 'POLYGON',
        txHash: batch.txHash,
        blockNumber: batch.blockNumber,
        anchoredAt: batch.anchoredAt,
      },
      message: `Batch of ${batch.leafCount} transaction audit logs anchored to Polygon PoS. Root: ${batch.root}`,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Merkle anchor cron error:', err);
    return Response.json({ error: err.message || 'Failed to anchor Merkle audit batch' }, { status: 500 });
  }
}
