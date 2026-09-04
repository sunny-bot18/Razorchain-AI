CREATE TYPE "public"."security_check_status" AS ENUM('SAFE', 'SUSPICIOUS', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('CREATED', 'PAYMENT_AUTHORIZED', 'FUNDS_RESERVED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING', 'VERIFIED', 'CAPTURE_REQUESTED', 'SETTLED', 'VERIFICATION_FAILED', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED', 'MANUAL_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('BUYER', 'SELLER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'MANUAL_REVIEW');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"run_id" uuid NOT NULL,
	"status" text DEFAULT 'RUNNING' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"confidence" real,
	"model" text,
	"start_time" timestamp,
	"end_time" timestamp,
	"duration_ms" integer,
	CONSTRAINT "agent_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid,
	"user_id" uuid,
	"actor" text NOT NULL,
	"event" text NOT NULL,
	"action" text NOT NULL,
	"result" text NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"po_number" text NOT NULL,
	"required_quantity" integer NOT NULL,
	"amount" real NOT NULL,
	"delivery_address" text NOT NULL,
	"expected_delivery_date" timestamp NOT NULL,
	"required_checks" text[] DEFAULT '{}' NOT NULL,
	"tolerances" jsonb,
	"parsed_conditions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"document_type" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"action" text NOT NULL,
	"amount" real NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"razorpay_response" jsonb,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_executions_transaction_id_unique" UNIQUE("transaction_id"),
	CONSTRAINT "payment_executions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payment_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text NOT NULL,
	"is_simulated" boolean DEFAULT false NOT NULL,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_reservations_transaction_id_unique" UNIQUE("transaction_id"),
	CONSTRAINT "payment_reservations_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "security_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"risk_score" real NOT NULL,
	"status" "security_check_status" DEFAULT 'SAFE' NOT NULL,
	"flags" text[] DEFAULT '{}' NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "security_checks_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_number" text NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"po_number" text NOT NULL,
	"product_description" text NOT NULL,
	"quantity" integer NOT NULL,
	"amount" real NOT NULL,
	"delivery_address" text NOT NULL,
	"expected_delivery_date" timestamp NOT NULL,
	"verification_conditions" text[] DEFAULT '{}' NOT NULL,
	"status" "transaction_status" DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_transaction_number_unique" UNIQUE("transaction_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"role" "user_role" DEFAULT 'BUYER' NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"status" "verification_status" DEFAULT 'PENDING' NOT NULL,
	"confidence" real,
	"checks" jsonb,
	"failed_checks" text[] DEFAULT '{}' NOT NULL,
	"extracted_data" jsonb,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verification_results_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_executions" ADD CONSTRAINT "payment_executions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reservations" ADD CONSTRAINT "payment_reservations_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_checks" ADD CONSTRAINT "security_checks_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_results" ADD CONSTRAINT "verification_results_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;