-- Advanced escrow & financial mechanics
ALTER TABLE "transactions" ADD COLUMN "auto_release_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "seller_proof_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "partial_quantity_shipped" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "partial_settlement_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "carrier" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "carrier_status" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "carrier_verified_at" timestamp;--> statement-breakpoint
-- Milestone auto-release
ALTER TABLE "payment_milestones" ADD COLUMN "auto_release_at" timestamp;--> statement-breakpoint
-- KYB on users
ALTER TABLE "users" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyb_status" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "kyb_cleared_at" timestamp;
