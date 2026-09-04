import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["BUYER", "SELLER", "ADMIN"]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "CREATED",
  "PAYMENT_AUTHORIZED",
  "FUNDS_RESERVED",
  "DELIVERY_PENDING",
  "IN_TRANSIT_UNVERIFIED",
  "VERIFICATION_PENDING",
  "AWAITING_MANUAL_TRIAGE",
  "VERIFIED",
  "CAPTURE_REQUESTED",
  "SETTLEMENT_QUEUED",
  "SETTLED",
  "VERIFICATION_FAILED",
  "PAYMENT_FAILED",
  "CANCELLED",
  "REFUNDED",
  "MANUAL_REVIEW",
  "DISPUTED",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "MANUAL_REVIEW",
]);

export const securityCheckStatusEnum = pgEnum("security_check_status", [
  "SAFE",
  "SUSPICIOUS",
  "BLOCKED",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "PENDING", "EVIDENCE_PENDING", "VERIFYING", "APPROVED", "SETTLED", "REJECTED", "MANUAL_REVIEW",
]);

// ── Tables ─────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  company: text("company"),
  role: userRoleEnum("role").notNull().default("BUYER"),
  passwordHash: text("password_hash").notNull(),
  taxId: text('tax_id'),
  kybStatus: text('kyb_status').notNull().default('PENDING'),
  kybClearedAt: timestamp('kyb_cleared_at'),
  uboDetails: jsonb('ubo_details'),
  corporateRegistration: jsonb('corporate_registration'),
  isTombstoned: boolean('is_tombstoned').notNull().default(false),
  tombstonedAt: timestamp('tombstoned_at'),
  tombstoneReason: text('tombstone_reason'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionNumber: text("transaction_number").notNull().unique(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => users.id),
  poNumber: text("po_number").notNull(),
  productDescription: text("product_description").notNull(),
  quantity: integer("quantity").notNull(),
  amount: real("amount").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date").notNull(),
  verificationConditions: text("verification_conditions")
    .array()
    .notNull()
    .default([]),
  status: transactionStatusEnum("status").notNull().default("CREATED"),
  inspectionDeadline: timestamp("inspection_deadline"),
  sellerGracePeriodHours: integer("seller_grace_period_hours").notNull().default(72),
  autoReleaseAt: timestamp('auto_release_at'),
  sellerProofDeadline: timestamp('seller_proof_deadline'),
  partialQuantityShipped: integer('partial_quantity_shipped').notNull().default(0),
  partialSettlementApproved: boolean('partial_settlement_approved').notNull().default(false),
  trackingNumber: text('tracking_number'),
  carrier: text('carrier'),
  carrierStatus: text('carrier_status'),
  carrierVerifiedAt: timestamp('carrier_verified_at'),
  dynamicDiscountOffered: boolean('dynamic_discount_offered').notNull().default(false),
  dynamicDiscountRate: real('dynamic_discount_rate'),
  dynamicDiscountAmount: real('dynamic_discount_amount'),
  dynamicDiscountAccepted: boolean('dynamic_discount_accepted').notNull().default(false),
  isFactored: boolean('is_factored').notNull().default(false),
  factoringLender: text('factoring_lender'),
  factoringAdvanceAmount: real('factoring_advance_amount'),
  currency: text('currency').notNull().default('INR'),
  lockedFxRate: real('locked_fx_rate'),
  hedgedAmount: real('hedged_amount'),
  fxLockedAt: timestamp('fx_locked_at'),
  requiresDualApproval: boolean('requires_dual_approval').notNull().default(false),
  firstApproverId: uuid('first_approver_id').references(() => users.id),
  firstApprovedAt: timestamp('first_approved_at'),
  secondApproverId: uuid('second_approver_id').references(() => users.id),
  secondApprovedAt: timestamp('second_approved_at'),
  merkleRoot: text('merkle_root'),
  merkleAnchorTx: text('merkle_anchor_tx'),
  merkleAnchoredAt: timestamp('merkle_anchored_at'),
  virtualAccount: jsonb('virtual_account'),
  netAdjustedAmount: real('net_adjusted_amount'),
  disputeDetails: jsonb('dispute_details'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .unique()
    .references(() => transactions.id),
  poNumber: text("po_number").notNull(),
  requiredQuantity: integer("required_quantity").notNull(),
  amount: real("amount").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date").notNull(),
  requiredChecks: text("required_checks").array().notNull().default([]),
  tolerances: jsonb("tolerances"),
  parsedConditions: jsonb("parsed_conditions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentReservations = pgTable("payment_reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .unique()
    .references(() => transactions.id),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull(),
  isSimulated: boolean("is_simulated").notNull().default(false),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  documentType: text("document_type").notNull(),
  sha256: text("sha256"),
  forensicMetadata: jsonb("forensic_metadata"),
  isShredded: boolean("is_shredded").notNull().default(false),
  shreddedAt: timestamp("shredded_at"),
  dekKeyId: text("dek_key_id"),
  shreddedReason: text("shredded_reason"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const paymentMilestones = pgTable("payment_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id),
  sequence: integer("sequence").notNull(),
  label: text("label").notNull(),
  percentage: real("percentage").notNull(),
  amount: real("amount").notNull(),
  requiredDocuments: text("required_documents").array().notNull().default([]),
  fulfilledQuantity: integer("fulfilled_quantity").notNull().default(0),
  status: milestoneStatusEnum("status").notNull().default("PENDING"),
  inspectionDeadline: timestamp("inspection_deadline"),
  settledAt: timestamp("settled_at"),
  autoReleaseAt: timestamp('auto_release_at'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactionMessages = pgTable("transaction_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  flaggedCheck: text("flagged_check"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const verificationResults = pgTable("verification_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .unique()
    .references(() => transactions.id),
  status: verificationStatusEnum("status").notNull().default("PENDING"),
  confidence: real("confidence"),
  checks: jsonb("checks"),
  failedChecks: text("failed_checks").array().notNull().default([]),
  extractedData: jsonb("extracted_data"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const securityChecks = pgTable("security_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .unique()
    .references(() => transactions.id),
  riskScore: real("risk_score").notNull(),
  status: securityCheckStatusEnum("status").notNull().default("SAFE"),
  flags: text("flags").array().notNull().default([]),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentExecutions = pgTable("payment_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .unique()
    .references(() => transactions.id),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  action: text("action").notNull(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("PENDING"),
  razorpayResponse: jsonb("razorpay_response"),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id),
  agentName: text("agent_name").notNull(),
  runId: uuid("run_id").notNull().unique(),
  status: text("status").notNull().default("RUNNING"),
  input: jsonb("input"),
  output: jsonb("output"),
  confidence: real("confidence"),
  model: text("model"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationMs: integer("duration_ms"),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  userId: uuid("user_id").references(() => users.id),
  actor: text("actor").notNull(),
  event: text("event").notNull(),
  action: text("action").notNull(),
  result: text("result").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const merkleBatches = pgTable("merkle_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  root: text("root").notNull(),
  leafCount: integer("leaf_count").notNull(),
  transactionIds: text("transaction_ids").array().notNull().default([]),
  chain: text("chain").notNull().default("POLYGON"),
  txHash: text("tx_hash"),
  blockNumber: integer("block_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tradeCreditPledges = pgTable("trade_credit_pledges", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id),
  lenderId: text("lender_id").notNull(),
  lenderName: text("lender_name").notNull(),
  advanceAmount: real("advance_amount").notNull(),
  discountFee: real("discount_fee").notNull().default(0),
  status: text("status").notNull().default("PLEDGED"),
  metadata: jsonb("metadata"),
  approvedAt: timestamp("approved_at"),
  disbursedAt: timestamp("disbursed_at"),
  disbursementUtr: text("disbursement_utr"),
  lienReference: text("lien_reference"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  settledAt: timestamp("settled_at"),
});

export const disputes = pgTable("disputes", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id),
  raisedById: uuid("raised_by_id")
    .notNull()
    .references(() => users.id),
  category: text("category").notNull(), // 'DAMAGED_GOODS' | 'SHORTAGE' | 'SPECIFICATION_MISMATCH' | 'DELAY' | 'OTHER'
  reason: text("reason").notNull(),
  claimAmount: real("claim_amount"),
  status: text("status").notNull().default("OPEN"), // 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'
  haltedAutoReleaseAt: timestamp("halted_auto_release_at"),
  resolution: jsonb("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adjustmentNotes = pgTable("adjustment_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id),
  issuedById: uuid("issued_by_id")
    .notNull()
    .references(() => users.id),
  noteNumber: text("note_number").notNull().unique(),
  type: text("type").notNull(), // 'DEBIT_NOTE' | 'CREDIT_NOTE'
  amount: real("amount").notNull(),
  reason: text("reason").notNull(),
  lineItemRef: text("line_item_ref"),
  status: text("status").notNull().default("ISSUED"), // 'ISSUED' | 'APPLIED' | 'REJECTED'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
