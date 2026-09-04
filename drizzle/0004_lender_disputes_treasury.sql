-- Add DISPUTED to transaction_status enum if not exists
ALTER TYPE "transaction_status" ADD VALUE IF NOT EXISTS 'DISPUTED';

-- Add new columns to transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "virtual_account" jsonb;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "net_adjusted_amount" real;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "dispute_details" jsonb;

-- Add new columns to trade_credit_pledges
ALTER TABLE "trade_credit_pledges" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;
ALTER TABLE "trade_credit_pledges" ADD COLUMN IF NOT EXISTS "disbursed_at" timestamp;
ALTER TABLE "trade_credit_pledges" ADD COLUMN IF NOT EXISTS "disbursement_utr" text;
ALTER TABLE "trade_credit_pledges" ADD COLUMN IF NOT EXISTS "lien_reference" text;

-- Create disputes table
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

-- Create adjustment_notes table
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
