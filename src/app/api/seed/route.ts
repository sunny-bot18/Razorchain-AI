import { type NextRequest } from 'next/server';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from '@/lib/db';
import * as schema from '@/lib/db/schema';

const SALT_ROUNDS = 10;

const DEMO_USERS: Array<{
  email: string;
  password: string;
  name: string;
  company: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
}> = [
  {
    email: 'buyer@demo.com',
    password: 'password123',
    name: 'Acme Manufacturing Corp',
    company: 'Acme Manufacturing Corp',
    role: 'BUYER',
  },
  {
    email: 'seller@demo.com',
    password: 'password123',
    name: 'Apex Precision Engineering Ltd',
    company: 'Apex Precision Engineering Ltd',
    role: 'SELLER',
  },
  {
    email: 'admin@demo.com',
    password: 'password123',
    name: 'RazorChain Compliance & Ops',
    company: 'RazorChain Operations',
    role: 'ADMIN',
  },
];

async function ensureSchemaCreated() {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "security_check_status" AS ENUM('SAFE', 'SUSPICIOUS', 'BLOCKED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "transaction_status" AS ENUM('CREATED', 'PAYMENT_AUTHORIZED', 'FUNDS_RESERVED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING', 'VERIFIED', 'CAPTURE_REQUESTED', 'SETTLED', 'VERIFICATION_FAILED', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED', 'MANUAL_REVIEW', 'DISPUTED', 'AWAITING_MANUAL_TRIAGE', 'IN_TRANSIT_UNVERIFIED', 'SETTLEMENT_QUEUED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "user_role" AS ENUM('BUYER', 'SELLER', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "verification_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "milestone_status" AS ENUM('PENDING', 'EVIDENCE_PENDING', 'VERIFYING', 'APPROVED', 'SETTLED', 'REJECTED', 'MANUAL_REVIEW');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "company" text,
        "role" "user_role" DEFAULT 'BUYER' NOT NULL,
        "password_hash" text NOT NULL,
        "tax_id" text,
        "kyb_status" text DEFAULT 'PENDING' NOT NULL,
        "kyb_cleared_at" timestamp,
        "ubo_details" jsonb,
        "corporate_registration" jsonb,
        "is_tombstoned" boolean DEFAULT false NOT NULL,
        "tombstoned_at" timestamp,
        "shredded_at" timestamp,
        "tombstone_reason" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_number" text NOT NULL UNIQUE,
        "buyer_id" uuid NOT NULL REFERENCES "users"("id"),
        "seller_id" uuid NOT NULL REFERENCES "users"("id"),
        "po_number" text NOT NULL,
        "product_description" text NOT NULL,
        "quantity" integer NOT NULL,
        "amount" real NOT NULL,
        "delivery_address" text NOT NULL,
        "expected_delivery_date" timestamp NOT NULL,
        "verification_conditions" text[] DEFAULT '{}' NOT NULL,
        "status" "transaction_status" DEFAULT 'CREATED' NOT NULL,
        "inspection_deadline" timestamp,
        "seller_grace_period_hours" integer DEFAULT 72 NOT NULL,
        "auto_release_at" timestamp,
        "seller_proof_deadline" timestamp,
        "partial_quantity_shipped" integer DEFAULT 0 NOT NULL,
        "partial_settlement_approved" boolean DEFAULT false NOT NULL,
        "tracking_number" text,
        "carrier" text,
        "carrier_status" text,
        "carrier_verified_at" timestamp,
        "dynamic_discount_offered" boolean DEFAULT false NOT NULL,
        "dynamic_discount_rate" real,
        "dynamic_discount_amount" real,
        "dynamic_discount_accepted" boolean DEFAULT false NOT NULL,
        "is_factored" boolean DEFAULT false NOT NULL,
        "factoring_lender" text,
        "factoring_advance_amount" real,
        "currency" text DEFAULT 'INR' NOT NULL,
        "locked_fx_rate" real,
        "hedged_amount" real,
        "fx_locked_at" timestamp,
        "requires_dual_approval" boolean DEFAULT false NOT NULL,
        "first_approver_id" uuid REFERENCES "users"("id"),
        "first_approved_at" timestamp,
        "second_approver_id" uuid REFERENCES "users"("id"),
        "second_approved_at" timestamp,
        "merkle_root" text,
        "merkle_anchor_tx" text,
        "merkle_anchored_at" timestamp,
        "virtual_account" jsonb,
        "net_adjusted_amount" real,
        "dispute_details" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "contracts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL UNIQUE REFERENCES "transactions"("id"),
        "po_number" text NOT NULL,
        "required_quantity" integer NOT NULL,
        "amount" real NOT NULL,
        "delivery_address" text NOT NULL,
        "expected_delivery_date" timestamp NOT NULL,
        "required_checks" text[] DEFAULT '{}' NOT NULL,
        "tolerances" jsonb,
        "parsed_conditions" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL REFERENCES "transactions"("id"),
        "file_name" text NOT NULL,
        "file_type" text NOT NULL,
        "file_path" text NOT NULL,
        "file_size" integer NOT NULL,
        "document_type" text NOT NULL,
        "sha256" text,
        "forensic_metadata" jsonb,
        "uploaded_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "verification_results" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL UNIQUE REFERENCES "transactions"("id"),
        "status" "verification_status" DEFAULT 'PENDING' NOT NULL,
        "confidence" real,
        "checks" jsonb,
        "failed_checks" text[] DEFAULT '{}' NOT NULL,
        "extracted_data" jsonb,
        "reason" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "payment_reservations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL UNIQUE REFERENCES "transactions"("id"),
        "razorpay_order_id" text,
        "razorpay_payment_id" text,
        "amount" real NOT NULL,
        "currency" text DEFAULT 'INR' NOT NULL,
        "status" text NOT NULL,
        "is_simulated" boolean DEFAULT false NOT NULL,
        "idempotency_key" text NOT NULL UNIQUE,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "payment_executions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL UNIQUE REFERENCES "transactions"("id"),
        "idempotency_key" text NOT NULL UNIQUE,
        "action" text NOT NULL,
        "amount" real NOT NULL,
        "status" text DEFAULT 'PENDING' NOT NULL,
        "razorpay_response" jsonb,
        "executed_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "payment_milestones" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL REFERENCES "transactions"("id"),
        "sequence" integer NOT NULL,
        "label" text NOT NULL,
        "percentage" real NOT NULL,
        "amount" real NOT NULL,
        "required_documents" text[] DEFAULT '{}' NOT NULL,
        "fulfilled_quantity" integer DEFAULT 0 NOT NULL,
        "status" "milestone_status" DEFAULT 'PENDING' NOT NULL,
        "inspection_deadline" timestamp,
        "auto_release_at" timestamp,
        "settled_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "security_checks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL UNIQUE REFERENCES "transactions"("id"),
        "risk_score" real NOT NULL,
        "status" "security_check_status" DEFAULT 'SAFE' NOT NULL,
        "flags" text[] DEFAULT '{}' NOT NULL,
        "details" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid REFERENCES "transactions"("id"),
        "user_id" uuid REFERENCES "users"("id"),
        "actor" text NOT NULL,
        "event" text NOT NULL,
        "action" text NOT NULL,
        "result" text NOT NULL,
        "metadata" jsonb,
        "timestamp" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "transaction_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL REFERENCES "transactions"("id"),
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "flagged_check" text,
        "body" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "owner_id" uuid NOT NULL REFERENCES "users"("id"),
        "url" text NOT NULL,
        "secret" text NOT NULL,
        "events" text[] DEFAULT '{}' NOT NULL,
        "active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "merkle_batches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "root" text NOT NULL,
        "leaf_count" integer NOT NULL,
        "transaction_ids" text[] DEFAULT '{}'::text[] NOT NULL,
        "chain" text DEFAULT 'POLYGON' NOT NULL,
        "tx_hash" text,
        "block_number" integer,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "trade_credit_pledges" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL REFERENCES "transactions"("id"),
        "lender_id" text NOT NULL,
        "lender_name" text NOT NULL,
        "advance_amount" real NOT NULL,
        "discount_fee" real DEFAULT 0 NOT NULL,
        "status" text DEFAULT 'PLEDGED' NOT NULL,
        "approved_at" timestamp,
        "disbursed_at" timestamp,
        "disbursement_utr" text,
        "lien_reference" text,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "settled_at" timestamp
      );

      CREATE TABLE IF NOT EXISTS "disputes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
        "raised_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "category" text NOT NULL,
        "reason" text NOT NULL,
        "claim_amount" real,
        "status" text DEFAULT 'OPEN' NOT NULL,
        "halted_auto_release_at" timestamp,
        "resolution" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "adjustment_notes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
        "issued_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "note_number" text NOT NULL UNIQUE,
        "type" text NOT NULL,
        "amount" real NOT NULL,
        "reason" text NOT NULL,
        "line_item_ref" text,
        "status" text DEFAULT 'ISSUED' NOT NULL,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "agent_runs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "transaction_id" uuid NOT NULL REFERENCES "transactions"("id"),
        "agent_name" text NOT NULL,
        "run_id" uuid NOT NULL UNIQUE,
        "status" text DEFAULT 'RUNNING' NOT NULL,
        "input" jsonb,
        "output" jsonb,
        "confidence" real,
        "model" text,
        "start_time" timestamp,
        "end_time" timestamp,
        "duration_ms" integer
      );

      CREATE INDEX IF NOT EXISTS "idx_transactions_buyer_id" ON "transactions" ("buyer_id");
      CREATE INDEX IF NOT EXISTS "idx_transactions_seller_id" ON "transactions" ("seller_id");
      CREATE INDEX IF NOT EXISTS "idx_transactions_status" ON "transactions" ("status");
      CREATE INDEX IF NOT EXISTS "idx_transactions_created_at" ON "transactions" ("created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_documents_transaction_id" ON "documents" ("transaction_id");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_transaction_id" ON "audit_logs" ("transaction_id");
      CREATE INDEX IF NOT EXISTS "idx_payment_milestones_transaction_id" ON "payment_milestones" ("transaction_id");
      CREATE INDEX IF NOT EXISTS "idx_transaction_messages_transaction_id" ON "transaction_messages" ("transaction_id");
      CREATE INDEX IF NOT EXISTS "idx_disputes_transaction_id" ON "disputes" ("transaction_id");
      CREATE INDEX IF NOT EXISTS "idx_adjustment_notes_transaction_id" ON "adjustment_notes" ("transaction_id");
      CREATE INDEX IF NOT EXISTS "idx_trade_credit_pledges_transaction_id" ON "trade_credit_pledges" ("transaction_id");
      CREATE INDEX IF NOT EXISTS "idx_trade_credit_pledges_lender_id" ON "trade_credit_pledges" ("lender_id");
    `);
  } finally {
    client.release();
  }
}

async function runSeed() {
  await ensureSchemaCreated();
  const passwordHash = await hash('password123', SALT_ROUNDS);

  const created: Array<typeof DEMO_USERS[number] & { id: string; passwordHash: string }> = [];

  for (const demoUser of DEMO_USERS) {
    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, demoUser.email))
      .limit(1);

    if (existing) {
      if (existing.name.startsWith('Demo ') || !existing.company) {
        await db
          .update(schema.users)
          .set({ name: demoUser.name, company: demoUser.company })
          .where(eq(schema.users.id, existing.id));
      }
      created.push({
        ...demoUser,
        id: existing.id,
        name: existing.name.startsWith('Demo ') ? demoUser.name : existing.name,
        company: existing.company ?? demoUser.company,
        passwordHash: existing.passwordHash,
      });
      continue;
    }

    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: demoUser.email,
        name: demoUser.name,
        company: demoUser.company,
        role: demoUser.role,
        passwordHash,
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        company: schema.users.company,
        role: schema.users.role,
        passwordHash: schema.users.passwordHash,
      });

    created.push({
      ...demoUser,
      ...newUser,
      company: newUser.company ?? demoUser.company,
    });
  }

  const buyer = created.find((user) => user.role === 'BUYER');
  const seller = created.find((user) => user.role === 'SELLER');
  if (!buyer || !seller) throw new Error('Demo users could not be initialized');

    const demoPo = 'PO-2026-1045';
    const [demoTransaction] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.transactionNumber, 'RC-DEMO-1045')).limit(1);
    if (!demoTransaction) {
      const [transaction] = await db.insert(schema.transactions).values({
        transactionNumber: 'RC-DEMO-1045', buyerId: buyer.id, sellerId: seller.id,
        poNumber: demoPo, productDescription: 'Industrial Bearings', quantity: 500,
        amount: 10000, deliveryAddress: 'Bengaluru', expectedDeliveryDate: new Date('2026-09-05T00:00:00.000Z'),
        verificationConditions: ['PO Match', 'Quantity Match', 'Address Match', 'Date Valid', 'Signed Proof'], status: 'CREATED',
      }).returning();
      await db.insert(schema.contracts).values({
        transactionId: transaction.id, poNumber: demoPo, requiredQuantity: 500, amount: 10000,
        deliveryAddress: 'Bengaluru', expectedDeliveryDate: new Date('2026-09-05T00:00:00.000Z'),
        requiredChecks: ['po_number_match', 'quantity_match', 'delivery_address_match', 'delivery_date_valid', 'signed_delivery_proof'],
        tolerances: { quantity_tolerance_percent: 0, delivery_date_tolerance_days: 1 },
      });
      await db.insert(schema.auditLogs).values({ transactionId: transaction.id, userId: buyer.id, actor: 'system', event: 'Demo transaction created', action: 'SEED', result: 'SUCCESS', metadata: { demo: true } });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 1. SEED ORDER 1: GEMINI VISION OUTAGE -> MANUAL VISION TRIAGE
    // ════════════════════════════════════════════════════════════════════════════
    const tx1Number = 'RC-RESIL-GEMINI-881';
    const po1Number = 'PO-2026-AI-881';
    const [existing1] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.transactionNumber, tx1Number)).limit(1);

    if (!existing1) {
      const [order1] = await db.insert(schema.transactions).values({
        transactionNumber: tx1Number,
        buyerId: buyer.id,
        sellerId: seller.id,
        poNumber: po1Number,
        productDescription: '500x High-Precision CNC Servo Actuators (Model AX-900)',
        quantity: 500,
        amount: 450000,
        deliveryAddress: 'Plant 4, Electronic City Phase 2, Bengaluru 560100',
        expectedDeliveryDate: new Date('2026-09-06T18:00:00.000Z'),
        verificationConditions: ['PO Match', 'Quantity Match', 'Address Match', 'Date Valid', 'Receiver Physical Stamp'],
        status: 'AWAITING_MANUAL_TRIAGE',
        currency: 'INR',
      }).returning();

      await db.insert(schema.contracts).values({
        transactionId: order1.id,
        poNumber: po1Number,
        requiredQuantity: 500,
        amount: 450000,
        deliveryAddress: 'Plant 4, Electronic City Phase 2, Bengaluru 560100',
        expectedDeliveryDate: new Date('2026-09-06T18:00:00.000Z'),
        requiredChecks: ['po_number_match', 'quantity_match', 'delivery_address_match', 'delivery_date_valid', 'signed_delivery_proof'],
        tolerances: { quantity_tolerance_percent: 0, delivery_date_tolerance_days: 1 },
      });

      await db.insert(schema.paymentReservations).values({
        transactionId: order1.id,
        razorpayOrderId: 'order_resil_gemini_881',
        razorpayPaymentId: 'pay_resil_gemini_881',
        amount: 450000,
        currency: 'INR',
        status: 'authorized',
        idempotencyKey: `reserve-${order1.id}-key`,
      });

      await db.insert(schema.documents).values({
        transactionId: order1.id,
        fileName: 'delivery_challan_cnc_actuators_signed.jpg',
        fileType: 'image/jpeg',
        filePath: '/tmp/delivery_challan_cnc_actuators_signed.jpg',
        fileSize: 184500,
        documentType: 'delivery_receipt',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      });

      await db.insert(schema.auditLogs).values([
        {
          transactionId: order1.id,
          userId: buyer.id,
          actor: buyer.email,
          event: 'ESCROW_RESERVED',
          action: 'RESERVE_PAYMENT',
          result: 'SUCCESS',
          metadata: { amount: 450000, currency: 'INR' },
        },
        {
          transactionId: order1.id,
          userId: seller.id,
          actor: seller.email,
          event: 'DELIVERY_EVIDENCE_UPLOADED',
          action: 'UPLOAD_CHALLAN',
          result: 'SUCCESS',
          metadata: { fileName: 'delivery_challan_cnc_actuators_signed.jpg' },
        },
        {
          transactionId: order1.id,
          userId: buyer.id,
          actor: 'GEMINI_VISION_GATEWAY_MONITOR',
          event: 'UPSTREAM_AI_VISION_DEGRADED',
          action: 'ROUTE_TO_MANUAL_TRIAGE',
          result: 'ROUTED_MANUAL_QUEUE',
          metadata: {
            reason: 'Gemini 2.5 Vision endpoint returned HTTP 503 / 429 rate limit timeout.',
            targetQueue: 'AWAITING_MANUAL_TRIAGE',
          },
        },
      ]);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 2. SEED ORDER 2: CARRIER OUTAGE -> MANUAL CONSIGNEE ATTESTATION & GPS
    // ════════════════════════════════════════════════════════════════════════════
    const tx2Number = 'RC-RESIL-CARRIER-402';
    const po2Number = 'PO-2026-LOG-402';
    const [existing2] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.transactionNumber, tx2Number)).limit(1);

    if (!existing2) {
      const [order2] = await db.insert(schema.transactions).values({
        transactionNumber: tx2Number,
        buyerId: buyer.id,
        sellerId: seller.id,
        poNumber: po2Number,
        productDescription: '1,200x Medical Grade Titanium Stents (Batch TS-99)',
        quantity: 1200,
        amount: 1200000,
        deliveryAddress: 'Warehouse 9, Hosur Road Logistics Park, Bengaluru 560068',
        expectedDeliveryDate: new Date('2026-09-05T12:00:00.000Z'),
        verificationConditions: ['PO Match', 'Quantity Match', 'Address Match', 'Date Valid', 'Consignee Signed Proof'],
        status: 'IN_TRANSIT_UNVERIFIED',
        carrier: 'BlueDart Express',
        trackingNumber: 'BD-9821471029-IN',
        carrierStatus: 'UNAVAILABLE',
        currency: 'INR',
      }).returning();

      await db.insert(schema.contracts).values({
        transactionId: order2.id,
        poNumber: po2Number,
        requiredQuantity: 1200,
        amount: 1200000,
        deliveryAddress: 'Warehouse 9, Hosur Road Logistics Park, Bengaluru 560068',
        expectedDeliveryDate: new Date('2026-09-05T12:00:00.000Z'),
        requiredChecks: ['po_number_match', 'quantity_match', 'delivery_address_match', 'delivery_date_valid', 'signed_delivery_proof'],
        tolerances: { quantity_tolerance_percent: 0, delivery_date_tolerance_days: 1 },
      });

      await db.insert(schema.paymentReservations).values({
        transactionId: order2.id,
        razorpayOrderId: 'order_resil_carrier_402',
        razorpayPaymentId: 'pay_resil_carrier_402',
        amount: 1200000,
        currency: 'INR',
        status: 'authorized',
        idempotencyKey: `reserve-${order2.id}-key`,
      });

      await db.insert(schema.auditLogs).values([
        {
          transactionId: order2.id,
          userId: buyer.id,
          actor: buyer.email,
          event: 'ESCROW_RESERVED',
          action: 'RESERVE_PAYMENT',
          result: 'SUCCESS',
          metadata: { amount: 1200000, currency: 'INR' },
        },
        {
          transactionId: order2.id,
          userId: seller.id,
          actor: seller.email,
          event: 'SHIPMENT_DISPATCHED',
          action: 'DISPATCH_CARRIER',
          result: 'SUCCESS',
          metadata: { carrier: 'BlueDart Express', awb: 'BD-9821471029-IN' },
        },
        {
          transactionId: order2.id,
          userId: buyer.id,
          actor: 'CARRIER_TELEMETRY_WATCHDOG',
          event: 'CARRIER_GATEWAY_UNAVAILABLE',
          action: 'SET_CARRIER_UNVERIFIED',
          result: 'FALLBACK_REQUIRED',
          metadata: {
            carrier: 'BlueDart Express',
            error: 'Carrier webhook timeout (HTTP 504) > 45 minutes.',
            fallbackRequirement: 'Manual Consignee Attestation with GPS stamp required.',
          },
        },
      ]);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 3. SEED ORDER 3: NODAL OUTAGE -> OVERNIGHT BATCH QUEUED
    // ════════════════════════════════════════════════════════════════════════════
    const tx3Number = 'RC-RESIL-NODAL-770';
    const po3Number = 'PO-2026-BANK-770';
    const [existing3] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.transactionNumber, tx3Number)).limit(1);

    if (!existing3) {
      const [order3] = await db.insert(schema.transactions).values({
        transactionNumber: tx3Number,
        buyerId: buyer.id,
        sellerId: seller.id,
        poNumber: po3Number,
        productDescription: '3,000x Monocrystalline Solar Photovoltaic Cells (450W)',
        quantity: 3000,
        amount: 2500000,
        deliveryAddress: 'Solar Farm Hub B, Kurnool Industrial Corridor, Andhra Pradesh 518002',
        expectedDeliveryDate: new Date('2026-09-04T15:00:00.000Z'),
        verificationConditions: ['PO Match', 'Quantity Match', 'Address Match', 'Date Valid', 'Signed Delivery Proof'],
        status: 'SETTLEMENT_QUEUED',
        currency: 'INR',
      }).returning();

      await db.insert(schema.contracts).values({
        transactionId: order3.id,
        poNumber: po3Number,
        requiredQuantity: 3000,
        amount: 2500000,
        deliveryAddress: 'Solar Farm Hub B, Kurnool Industrial Corridor, Andhra Pradesh 518002',
        expectedDeliveryDate: new Date('2026-09-04T15:00:00.000Z'),
        requiredChecks: ['po_number_match', 'quantity_match', 'delivery_address_match', 'delivery_date_valid', 'signed_delivery_proof'],
        tolerances: { quantity_tolerance_percent: 0, delivery_date_tolerance_days: 1 },
      });

      await db.insert(schema.paymentReservations).values({
        transactionId: order3.id,
        razorpayOrderId: 'order_resil_nodal_770',
        razorpayPaymentId: 'pay_resil_nodal_770',
        amount: 2500000,
        currency: 'INR',
        status: 'authorized',
        idempotencyKey: `reserve-${order3.id}-key`,
      });

      await db.insert(schema.verificationResults).values({
        transactionId: order3.id,
        status: 'APPROVED',
        confidence: 0.99,
        reason: 'All 5 automated checks verified with 99% confidence. Physical POD signed and stamped.',
        checks: [
          { name: 'po_number_match', status: 'PASS', expected: po3Number, actual: po3Number },
          { name: 'quantity_match', status: 'PASS', expected: '3000', actual: '3000' },
          { name: 'delivery_address_match', status: 'PASS', expected: 'Solar Farm Hub B', actual: 'Solar Farm Hub B, Kurnool' },
          { name: 'delivery_date_valid', status: 'PASS', expected: '2026-09-04', actual: '2026-09-04' },
          { name: 'signed_delivery_proof', status: 'PASS', expected: 'Signed', actual: 'Verified Stamp & Sign' },
        ],
      });

      await db.insert(schema.securityChecks).values({
        transactionId: order3.id,
        status: 'SAFE',
        riskScore: 4,
        flags: [],
      });

      await db.insert(schema.auditLogs).values([
        {
          transactionId: order3.id,
          userId: buyer.id,
          actor: buyer.email,
          event: 'ESCROW_RESERVED',
          action: 'RESERVE_PAYMENT',
          result: 'SUCCESS',
          metadata: { amount: 2500000, currency: 'INR' },
        },
        {
          transactionId: order3.id,
          userId: buyer.id,
          actor: 'AI_VERIFICATION_ENGINE',
          event: 'DELIVERY_VERIFIED_100_PERCENT',
          action: 'AUTO_VERIFY',
          result: 'APPROVED',
          metadata: { confidence: 0.99, checksPassed: 5 },
        },
        {
          transactionId: order3.id,
          userId: buyer.id,
          actor: 'NODAL_CLEARING_CIRCUIT_BREAKER',
          event: 'PAYMENT_GATEWAY_MAINTENANCE_QUEUED',
          action: 'QUEUE_OVERNIGHT_BATCH',
          result: 'SETTLEMENT_QUEUED',
          metadata: {
            reason: 'Razorpay / RBI Nodal RTGS gateway offline for scheduled maintenance.',
            action: 'Buffered to Overnight Settlement Batch queue.',
          },
        },
      ]);
    }

    return {
      message: 'Seeding complete with Resilience Matrix demo orders',
      demoTransactionNumber: 'RC-DEMO-1045',
      resilienceOrders: [tx1Number, tx2Number, tx3Number],
      users: created.map(({ id, email, name, company, role }) => ({
        id,
        email,
        name,
        company,
        role,
      })),
    };
}

export async function POST(request: NextRequest) {
  try {
    void request;
    const result = await runSeed();
    return Response.json(result);
  } catch (error) {
    console.error('Seed POST error:', error);
    return Response.json({ error: 'Failed to seed users and initialize database' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    void request;
    const result = await runSeed();
    return Response.json(result);
  } catch (error) {
    console.error('Seed GET error:', error);
    return Response.json({ error: 'Failed to seed users and initialize database' }, { status: 500 });
  }
}
