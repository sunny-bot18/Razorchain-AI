-- Performance indexes for high-concurrency multi-user operations
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
