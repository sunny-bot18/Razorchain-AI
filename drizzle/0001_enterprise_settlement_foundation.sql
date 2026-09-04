CREATE TYPE "public"."milestone_status" AS ENUM('PENDING', 'EVIDENCE_PENDING', 'VERIFYING', 'APPROVED', 'SETTLED', 'REJECTED', 'MANUAL_REVIEW');--> statement-breakpoint
CREATE TABLE "payment_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"label" text NOT NULL,
	"percentage" real NOT NULL,
	"amount" real NOT NULL,
	"required_documents" text[] DEFAULT '{}' NOT NULL,
	"fulfilled_quantity" integer DEFAULT 0 NOT NULL,
	"status" "milestone_status" DEFAULT 'PENDING' NOT NULL,
	"inspection_deadline" timestamp,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"flagged_check" text,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "sha256" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "forensic_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "inspection_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "seller_grace_period_hours" integer DEFAULT 72 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_messages" ADD CONSTRAINT "transaction_messages_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_messages" ADD CONSTRAINT "transaction_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;