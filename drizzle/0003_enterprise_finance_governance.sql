-- Enterprise Finance, Governance & Merkle Anchoring Migration
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ubo_details" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "corporate_registration" jsonb;--> statement-breakpoint

ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "dynamic_discount_offered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "dynamic_discount_rate" real;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "dynamic_discount_amount" real;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "dynamic_discount_accepted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "is_factored" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "factoring_lender" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "factoring_advance_amount" real;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "locked_fx_rate" real;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "hedged_amount" real;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "fx_locked_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "requires_dual_approval" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "first_approver_id" uuid REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "first_approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "second_approver_id" uuid REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "second_approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "merkle_root" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "merkle_anchor_tx" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "merkle_anchored_at" timestamp;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "merkle_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "root" text NOT NULL,
  "leaf_count" integer NOT NULL,
  "transaction_ids" text[] DEFAULT '{}'::text[] NOT NULL,
  "chain" text DEFAULT 'POLYGON' NOT NULL,
  "tx_hash" text,
  "block_number" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "trade_credit_pledges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transaction_id" uuid NOT NULL REFERENCES "transactions"("id"),
  "lender_id" text NOT NULL,
  "lender_name" text NOT NULL,
  "advance_amount" real NOT NULL,
  "discount_fee" real DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'PLEDGED' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "settled_at" timestamp
);
