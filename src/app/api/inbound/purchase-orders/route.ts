import { type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { ContractAgent } from '@/lib/agents/contract-agent';

const RAZORCHAIN_API_KEY = process.env.RAZORCHAIN_API_KEY || 'dev-api-key-change-in-production';

const poSchema = z.object({
  buyerEmail: z.string().email(),
  sellerEmail: z.string().email(),
  poNumber: z.string().trim().min(2).max(100),
  productDescription: z.string().trim().min(2).max(2000),
  quantity: z.coerce.number().int().positive().max(10_000_000),
  amount: z.coerce.number().positive().max(100_000_000),
  deliveryAddress: z.string().trim().min(3).max(500),
  expectedDeliveryDate: z.coerce.date(),
  verificationConditions: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
});

export async function POST(request: NextRequest) {
  try {
    // API key authentication
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '').trim();
    if (!RAZORCHAIN_API_KEY || apiKey !== RAZORCHAIN_API_KEY) {
      return Response.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const parsed = poSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Invalid PO input', details: parsed.error.flatten() }, { status: 400 });
    const { buyerEmail, sellerEmail, poNumber, productDescription, quantity, amount, deliveryAddress, expectedDeliveryDate, verificationConditions } = parsed.data;

    // Look up buyer and seller by email
    const [[buyer], [seller]] = await Promise.all([
      db.select().from(schema.users).where(and(eq(schema.users.email, buyerEmail), eq(schema.users.role, 'BUYER'))).limit(1),
      db.select().from(schema.users).where(and(eq(schema.users.email, sellerEmail), eq(schema.users.role, 'SELLER'))).limit(1),
    ]);
    if (!buyer) return Response.json({ error: `Buyer with email ${buyerEmail} not found` }, { status: 400 });
    if (!seller) return Response.json({ error: `Seller with email ${sellerEmail} not found` }, { status: 400 });

    const transactionNumber = `RC-${nanoid(6)}`;
    const [transaction] = await db.insert(schema.transactions).values({
      transactionNumber,
      buyerId: buyer.id,
      sellerId: seller.id,
      poNumber,
      productDescription,
      quantity,
      amount,
      deliveryAddress,
      expectedDeliveryDate,
      verificationConditions: verificationConditions || [],
      status: 'CREATED',
    }).returning();

    // Run ContractAgent
    try {
      const contractAgent = new ContractAgent();
      const contractResult = await contractAgent.execute({
        poNumber, productDescription, quantity, amount, deliveryAddress,
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
      }
    } catch (agentError) {
      console.error('ContractAgent error (non-fatal):', agentError);
    }

    await db.insert(schema.auditLogs).values({
      transactionId: transaction.id,
      actor: `erp-api:${buyerEmail}`,
      event: 'PO_CREATED_VIA_API',
      action: 'CREATE',
      result: 'SUCCESS',
      metadata: { transactionNumber, source: 'inbound-api', poNumber, amount },
    });

    return Response.json({ transaction }, { status: 201 });
  } catch (err) {
    console.error('Inbound PO error:', err);
    return Response.json({ error: 'Failed to create purchase order' }, { status: 500 });
  }
}
