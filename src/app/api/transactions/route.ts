import { type NextRequest } from 'next/server';
import { and, eq, or, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getUser } from '@/lib/auth';
import { ContractAgent } from '@/lib/agents/contract-agent';
import { z } from 'zod';
import { screenSanctions } from '@/lib/services/kyb-service';
import { dispatchWebhook } from '@/lib/services/webhook-service';
import { scryAgent } from '@/lib/agents/scry-agent';
import { lockCrossBorderFx } from '@/lib/services/fx-hedge-service';
import { ensureDatabaseInitialized } from '@/lib/db/init-db';

const createTransactionSchema = z.object({
  sellerId: z.string().uuid(),
  poNumber: z.string().trim().min(2).max(100),
  productDescription: z.string().trim().min(2).max(2000),
  quantity: z.coerce.number().int().positive().max(10_000_000),
  amount: z.coerce.number().positive().max(100_000_000),
  deliveryAddress: z.string().trim().min(3).max(500),
  expectedDeliveryDate: z.coerce.date(),
  verificationConditions: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  currency: z.string().trim().max(10).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let transactions;

    if (user.role === 'ADMIN') {
      transactions = await db
        .select({
          id: schema.transactions.id,
          transactionNumber: schema.transactions.transactionNumber,
          buyerId: schema.transactions.buyerId,
          sellerId: schema.transactions.sellerId,
          poNumber: schema.transactions.poNumber,
          productDescription: schema.transactions.productDescription,
          quantity: schema.transactions.quantity,
          amount: schema.transactions.amount,
          deliveryAddress: schema.transactions.deliveryAddress,
          expectedDeliveryDate: schema.transactions.expectedDeliveryDate,
          verificationConditions: schema.transactions.verificationConditions,
          status: schema.transactions.status,
          createdAt: schema.transactions.createdAt,
          updatedAt: schema.transactions.updatedAt,
          buyerName: schema.users.name,
          buyerCompany: schema.users.company,
          buyerIsTombstoned: schema.users.isTombstoned,
          buyerTombstonedAt: schema.users.tombstonedAt,
        })
        .from(schema.transactions)
        .leftJoin(schema.users, eq(schema.transactions.buyerId, schema.users.id))
        .orderBy(desc(schema.transactions.createdAt));
    } else if (user.role === 'BUYER') {
      transactions = await db
        .select({
          id: schema.transactions.id,
          transactionNumber: schema.transactions.transactionNumber,
          buyerId: schema.transactions.buyerId,
          sellerId: schema.transactions.sellerId,
          poNumber: schema.transactions.poNumber,
          productDescription: schema.transactions.productDescription,
          quantity: schema.transactions.quantity,
          amount: schema.transactions.amount,
          deliveryAddress: schema.transactions.deliveryAddress,
          expectedDeliveryDate: schema.transactions.expectedDeliveryDate,
          verificationConditions: schema.transactions.verificationConditions,
          status: schema.transactions.status,
          createdAt: schema.transactions.createdAt,
          updatedAt: schema.transactions.updatedAt,
          buyerName: schema.users.name,
          buyerCompany: schema.users.company,
          buyerIsTombstoned: schema.users.isTombstoned,
          buyerTombstonedAt: schema.users.tombstonedAt,
        })
        .from(schema.transactions)
        .leftJoin(schema.users, eq(schema.transactions.buyerId, schema.users.id))
        .where(eq(schema.transactions.buyerId, user.id))
        .orderBy(desc(schema.transactions.createdAt));
    } else {
      // SELLER
      transactions = await db
        .select({
          id: schema.transactions.id,
          transactionNumber: schema.transactions.transactionNumber,
          buyerId: schema.transactions.buyerId,
          sellerId: schema.transactions.sellerId,
          poNumber: schema.transactions.poNumber,
          productDescription: schema.transactions.productDescription,
          quantity: schema.transactions.quantity,
          amount: schema.transactions.amount,
          deliveryAddress: schema.transactions.deliveryAddress,
          expectedDeliveryDate: schema.transactions.expectedDeliveryDate,
          verificationConditions: schema.transactions.verificationConditions,
          status: schema.transactions.status,
          createdAt: schema.transactions.createdAt,
          updatedAt: schema.transactions.updatedAt,
          buyerName: schema.users.name,
          buyerCompany: schema.users.company,
          buyerIsTombstoned: schema.users.isTombstoned,
          buyerTombstonedAt: schema.users.tombstonedAt,
        })
        .from(schema.transactions)
        .leftJoin(schema.users, eq(schema.transactions.buyerId, schema.users.id))
        .where(eq(schema.transactions.sellerId, user.id))
        .orderBy(desc(schema.transactions.createdAt));
    }

    // Fetch seller names and companies separately to keep the query simpler
    const sellerIds = [...new Set(transactions.map((t) => t.sellerId))];
    const sellers = sellerIds.length > 0
      ? await db
          .select({
            id: schema.users.id,
            name: schema.users.name,
            company: schema.users.company,
            isTombstoned: schema.users.isTombstoned,
            tombstonedAt: schema.users.tombstonedAt,
          })
          .from(schema.users)
          .where(or(...sellerIds.map((id) => eq(schema.users.id, id))))
      : [];

    const sellerMap = new Map(sellers.map((s) => [s.id, s]));

    const result = transactions.map((t) => {
      const sellerInfo = sellerMap.get(t.sellerId);
      const cleanBuyerName = (t.buyerName === 'Demo Buyer' || !t.buyerName)
        ? (t.buyerCompany || 'Acme Manufacturing Corp')
        : t.buyerName;
      const cleanSellerName = (sellerInfo?.name === 'Demo Seller' || !sellerInfo?.name)
        ? (sellerInfo?.company || 'Apex Precision Engineering Ltd')
        : sellerInfo?.name;

      return {
        ...t,
        buyerName: cleanBuyerName,
        buyerCompany: t.buyerCompany || null,
        buyerIsTombstoned: Boolean(t.buyerIsTombstoned),
        buyerTombstonedAt: t.buyerTombstonedAt?.toISOString() || null,
        sellerName: cleanSellerName,
        sellerCompany: sellerInfo?.company || null,
        sellerIsTombstoned: Boolean(sellerInfo?.isTombstoned),
        sellerTombstonedAt: sellerInfo?.tombstonedAt?.toISOString() || null,
      };
    });

    return Response.json({ transactions: result });
  } catch (error) {
    console.error('Transactions GET error:', error);
    return Response.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseInitialized();
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'BUYER') {
      return Response.json({ error: 'Only buyers can create transactions' }, { status: 403 });
    }

    const parsed = createTransactionSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Invalid transaction input', details: parsed.error.flatten() }, { status: 400 });
    const { sellerId, poNumber, productDescription, quantity, amount, deliveryAddress, expectedDeliveryDate, verificationConditions } = parsed.data;

    const [seller] = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users)
      .where(and(eq(schema.users.id, sellerId), eq(schema.users.role, 'SELLER'))).limit(1);
    if (!seller) return Response.json({ error: 'Selected seller does not exist' }, { status: 400 });

    // KYB sanctions screening on both parties
    try {
      const [buyerKyb, sellerKyb] = await Promise.all([
        screenSanctions(user.name, undefined),
        screenSanctions(seller.name, undefined),
      ]);
      if (!buyerKyb.cleared) {
        return Response.json({
          error: 'Transaction blocked: buyer failed sanctions screening',
          flags: buyerKyb.flags,
        }, { status: 403 });
      }
      if (!sellerKyb.cleared) {
        return Response.json({
          error: 'Transaction blocked: seller failed sanctions screening',
          flags: sellerKyb.flags,
        }, { status: 403 });
      }
    } catch (kybErr) {
      console.warn('[transactions] KYB check failed (non-fatal):', kybErr);
      // Non-fatal — allow transaction if KYB service is unavailable
    }

    // Scry AI: Operational anomaly detection on commercial velocity and unit pricing
    let initialStatus: 'CREATED' | 'MANUAL_REVIEW' = 'CREATED';
    let scryFlags: string[] = [];
    try {
      const scryResult = await scryAgent.execute({
        buyerId: user.id,
        sellerId,
        amount,
        quantity,
        productDescription,
      });
      if (scryResult.status === 'success' && scryResult.data) {
        if (!scryResult.data.safe || scryResult.data.recommendation === 'MANUAL_REVIEW') {
          initialStatus = 'MANUAL_REVIEW';
          scryFlags = scryResult.data.flags;
        }
      }
    } catch (scryErr) {
      console.warn('[transactions] Scry AI check failed (non-fatal):', scryErr);
    }

    const transactionNumber = `RC-${nanoid(6)}`;
    const isHighValue = amount >= 1_000_000;

    const [transaction] = await db
      .insert(schema.transactions)
      .values({
        transactionNumber,
        buyerId: user.id,
        sellerId,
        poNumber,
        productDescription,
        quantity,
        amount,
        currency: parsed.data.currency ? parsed.data.currency.toUpperCase() : 'INR',
        deliveryAddress,
        expectedDeliveryDate,
        verificationConditions: verificationConditions || [],
        status: initialStatus,
        requiresDualApproval: isHighValue,
      })
      .returning();

    // Log Scry anomaly flag if triggered
    if (initialStatus === 'MANUAL_REVIEW') {
      await db.insert(schema.auditLogs).values({
        transactionId: transaction.id,
        actor: 'ai:scry-anomaly-detector',
        event: 'SCRY_ANOMALY_TRIGGERED',
        action: 'FLAG_RISK',
        result: 'MANUAL_REVIEW',
        metadata: { flags: scryFlags, amount, quantity },
      });
    }

    // Cross-border FX forward rate lock if currency is non-INR
    if (parsed.data.currency && parsed.data.currency.toUpperCase() !== 'INR') {
      try {
        await lockCrossBorderFx(transaction.id, parsed.data.currency.toUpperCase(), 'INR');
      } catch (fxErr) {
        console.warn('[transactions] FX lock failed (non-fatal):', fxErr);
      }
    }

    // Run ContractAgent to generate contract data
    try {
      const contractAgent = new ContractAgent();
      const contractResult = await contractAgent.execute({
        poNumber,
        productDescription,
        quantity,
        amount,
        deliveryAddress,
        expectedDeliveryDate: expectedDeliveryDate.toISOString(),
        verificationConditions: verificationConditions || [],
      });

      if (contractResult.status === 'success' && contractResult.data) {
        const cd = contractResult.data;
        await db.insert(schema.contracts).values({
          transactionId: transaction.id,
          poNumber: cd.po_number,
          requiredQuantity: cd.required_quantity,
          amount: cd.amount,
          deliveryAddress: cd.delivery_address,
          expectedDeliveryDate: new Date(cd.expected_delivery_date),
          requiredChecks: cd.required_checks,
          tolerances: cd.tolerances,
          parsedConditions: null,
        });

        // Log agent run
        await db.insert(schema.agentRuns).values({
          transactionId: transaction.id,
          agentName: contractResult.agentName,
          runId: contractResult.runId,
          status: contractResult.status,
          input: { poNumber, quantity, amount, deliveryAddress, expectedDeliveryDate, verificationConditions, productDescription },
          output: contractResult.data,
          confidence: contractResult.confidence,
          model: contractResult.model,
          startTime: new Date(Date.now() - contractResult.durationMs),
          endTime: new Date(),
          durationMs: contractResult.durationMs,
        });
      }
    } catch (agentError) {
      console.error('ContractAgent error (non-fatal):', agentError);
      // Contract agent failure is non-fatal for transaction creation
    }

    // Log to audit
    await db.insert(schema.auditLogs).values({
      transactionId: transaction.id,
      userId: user.id,
      actor: user.email,
      event: 'TRANSACTION_CREATED',
      action: 'CREATE',
      result: 'SUCCESS',
      metadata: { transactionNumber, sellerId, poNumber, amount },
    });

    // Dispatch webhook
    void dispatchWebhook(transaction.id, 'PO_CREATED', { transactionNumber, poNumber, amount }, [user.id, sellerId]).catch(() => {});

    return Response.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error('Transactions POST error:', error);
    return Response.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
