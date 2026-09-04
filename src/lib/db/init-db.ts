import { pool, db } from './index';
import * as schema from './schema';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 10;

let _schemaInitialized = false;
let _schemaInitPromise: Promise<void> | null = null;

export async function ensureDatabaseInitialized() {
  if (_schemaInitialized) return;
  if (_schemaInitPromise) return _schemaInitPromise;

  _schemaInitPromise = (async () => {
    const client = await pool.connect();
    try {
      // 1. Create enum types safely
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
      `);

      // 2. Create core tables if not exists
      await client.query(`
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
      `);

      // 3. Performance Indexes
      await client.query(`
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

      // 4. Default demo users
      const DEMO_USERS = [
        { email: 'buyer@demo.com', password: 'password123', name: 'Acme Manufacturing Corp', company: 'Acme Manufacturing Corp', role: 'BUYER' as const },
        { email: 'seller@demo.com', password: 'password123', name: 'Apex Precision Engineering Ltd', company: 'Apex Precision Engineering Ltd', role: 'SELLER' as const },
        { email: 'admin@demo.com', password: 'password123', name: 'RazorChain Compliance & Ops', company: 'RazorChain Operations', role: 'ADMIN' as const },
      ];
      const passwordHash = await hash('password123', SALT_ROUNDS);
      for (const u of DEMO_USERS) {
        const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, u.email)).limit(1);
        if (!existing) {
          await db.insert(schema.users).values({
            email: u.email,
            name: u.name,
            company: u.company,
            role: u.role,
            passwordHash,
          });
        }
      }

      _schemaInitialized = true;
    } catch (err) {
      console.error('[ensureDatabaseInitialized] error:', err);
    } finally {
      client.release();
      _schemaInitPromise = null;
    }
  })();

  return _schemaInitPromise;
}
