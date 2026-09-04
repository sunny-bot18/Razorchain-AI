import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { canAccessTransaction, getUser } from '@/lib/auth';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

const noteSchema = z.object({
  type: z.enum(['DEBIT_NOTE', 'CREDIT_NOTE']),
  noteNumber: z.string().trim().min(3).max(64).optional(),
  amount: z.number().positive(),
  reason: z.string().trim().min(3).max(500),
  lineItemRef: z.string().trim().max(100).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const tx = await findTransactionByIdOrNumber(id);

    if (!tx) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!canAccessTransaction(user, tx)) {
      return Response.json({ error: 'Not authorized for this transaction' }, { status: 403 });
    }

    const txUuid = tx.id;

    const notes = await db
      .select()
      .from(schema.adjustmentNotes)
      .where(eq(schema.adjustmentNotes.transactionId, txUuid))
      .orderBy(schema.adjustmentNotes.createdAt);

    let totalDebits = 0;
    let totalCredits = 0;
    for (const note of notes) {
      if (note.type === 'DEBIT_NOTE') totalDebits += note.amount;
      if (note.type === 'CREDIT_NOTE') totalCredits += note.amount;
    }

    const netAdjustedAmount = tx.netAdjustedAmount ?? Math.max(0, tx.amount - totalDebits + totalCredits);

    return Response.json({
      notes,
      summary: {
        originalAmount: tx.amount,
        totalDebits,
        totalCredits,
        netAdjustedAmount,
        currency: tx.currency || 'INR',
      },
    });
  } catch (err: any) {
    console.error('Debit notes GET error:', err);
    return Response.json({ error: err.message || 'Failed to fetch adjustment notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await ensureDatabaseInitialized();

    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const tx = await findTransactionByIdOrNumber(id);

    if (!tx) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!canAccessTransaction(user, tx)) {
      return Response.json({ error: 'Not authorized for this transaction' }, { status: 403 });
    }

    const txUuid = tx.id;

    if (['SETTLED', 'CANCELLED', 'REFUNDED'].includes(tx.status)) {
      return Response.json({
        error: `Cannot issue adjustment notes on a ${tx.status} transaction`,
      }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid note payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { type, amount, reason, lineItemRef } = parsed.data;
    if (amount > tx.amount) {
      return Response.json({ error: 'Adjustment note amount cannot exceed total transaction amount' }, { status: 400 });
    }

    const randomEntropy = Math.random().toString(36).slice(2, 6).toUpperCase();
    const noteNumber = parsed.data.noteNumber || `${type === 'DEBIT_NOTE' ? 'DN' : 'CN'}-${Date.now().toString().slice(-6)}-${randomEntropy}`;

    // Insert note
    const [note] = await db
      .insert(schema.adjustmentNotes)
      .values({
        transactionId: txUuid,
        issuedById: user.id,
        noteNumber,
        type,
        amount,
        reason,
        lineItemRef: lineItemRef || null,
        status: 'ISSUED',
        metadata: {
          issuedByEmail: user.email,
          previousTxAmount: tx.amount,
        },
      })
      .returning();

    // Query all notes for transaction to compute updated net amount
    const allNotes = await db
      .select()
      .from(schema.adjustmentNotes)
      .where(eq(schema.adjustmentNotes.transactionId, txUuid));

    let totalDebits = 0;
    let totalCredits = 0;
    for (const n of allNotes) {
      if (n.type === 'DEBIT_NOTE') totalDebits += n.amount;
      if (n.type === 'CREDIT_NOTE') totalCredits += n.amount;
    }

    const netAdjustedAmount = Math.max(0, Math.round((tx.amount - totalDebits + totalCredits) * 100) / 100);

    // Update transaction
    await db
      .update(schema.transactions)
      .set({
        netAdjustedAmount,
        updatedAt: new Date(),
      })
      .where(eq(schema.transactions.id, txUuid));

    await db.insert(schema.auditLogs).values({
      transactionId: txUuid,
      userId: user.id,
      actor: user.email,
      event: 'ADJUSTMENT_NOTE_ISSUED',
      action: 'ISSUE_NOTE',
      result: 'SUCCESS',
      metadata: {
        noteId: note.id,
        noteNumber,
        type,
        amount,
        reason,
        netAdjustedAmount,
      },
    });

    return Response.json({
      success: true,
      note,
      summary: {
        originalAmount: tx.amount,
        totalDebits,
        totalCredits,
        netAdjustedAmount,
      },
      message: `${type === 'DEBIT_NOTE' ? 'Debit' : 'Credit'} note ${noteNumber} issued. Reconciled net payable amount: ₹${netAdjustedAmount.toLocaleString('en-IN')}.`,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Debit notes POST error:', err);
    return Response.json({ error: err.message || 'Failed to issue adjustment note' }, { status: 500 });
  }
}
