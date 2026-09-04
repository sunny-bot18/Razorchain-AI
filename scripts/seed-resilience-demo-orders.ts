import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import * as schema from '../src/lib/db/schema';
import crypto from 'crypto';

async function main() {
  console.log('--- Seeding 3 Live Resilience Matrix Demonstration Orders ---');

  // 1. Fetch or verify demo users
  const [buyer] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'buyer@demo.com'))
    .limit(1);

  const [seller] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'seller@demo.com'))
    .limit(1);

  const [admin] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'admin@demo.com'))
    .limit(1);

  if (!buyer || !seller || !admin) {
    console.error('Demo users not found. Please run seed endpoint first.');
    process.exit(1);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ORDER 1: DEMO FOR GEMINI VISION OUTAGE -> MANUAL VISION TRIAGE WORKBENCH
  // ════════════════════════════════════════════════════════════════════════════
  const tx1Number = 'RC-RESIL-GEMINI-881';
  const po1Number = 'PO-2026-AI-881';

  // Delete existing if re-running
  const [existing1] = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.transactionNumber, tx1Number))
    .limit(1);

  if (existing1) {
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.transactionId, existing1.id));
    await db.delete(schema.contracts).where(eq(schema.contracts.transactionId, existing1.id));
    await db.delete(schema.documents).where(eq(schema.documents.transactionId, existing1.id));
    await db.delete(schema.paymentReservations).where(eq(schema.paymentReservations.transactionId, existing1.id));
    await db.delete(schema.transactions).where(eq(schema.transactions.id, existing1.id));
  }

  const [order1] = await db
    .insert(schema.transactions)
    .values({
      transactionNumber: tx1Number,
      buyerId: buyer.id,
      sellerId: seller.id,
      poNumber: po1Number,
      productDescription: '500x High-Precision CNC Servo Actuators (Model AX-900)',
      quantity: 500,
      amount: 450000,
      deliveryAddress: 'Plant 4, Electronic City Phase 2, Bengaluru, Karnataka 560100',
      expectedDeliveryDate: new Date('2026-09-06T18:00:00.000Z'),
      verificationConditions: ['PO Match', 'Quantity Match', 'Address Match', 'Date Valid', 'Receiver Physical Stamp'],
      status: 'AWAITING_MANUAL_TRIAGE',
      currency: 'INR',
      createdAt: new Date(Date.now() - 3600 * 1000 * 4), // 4 hours ago
    })
    .returning();

  await db.insert(schema.contracts).values({
    transactionId: order1.id,
    poNumber: po1Number,
    requiredQuantity: 500,
    amount: 450000,
    deliveryAddress: 'Plant 4, Electronic City Phase 2, Bengaluru, Karnataka 560100',
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
    sha256: crypto.createHash('sha256').update(tx1Number).digest('hex'),
  });

  await db.insert(schema.auditLogs).values([
    {
      transactionId: order1.id,
      userId: buyer.id,
      actor: buyer.email,
      event: 'ESCROW_RESERVED',
      action: 'RESERVE_PAYMENT',
      result: 'SUCCESS',
      metadata: { amount: 450000, currency: 'INR', virtualVault: 'VA_NODAL_ACME_001' },
      timestamp: new Date(Date.now() - 3600 * 1000 * 4),
    },
    {
      transactionId: order1.id,
      userId: seller.id,
      actor: seller.email,
      event: 'DELIVERY_EVIDENCE_UPLOADED',
      action: 'UPLOAD_CHALLAN',
      result: 'SUCCESS',
      metadata: { fileName: 'delivery_challan_cnc_actuators_signed.jpg', size: 184500 },
      timestamp: new Date(Date.now() - 3600 * 1000 * 2),
    },
    {
      transactionId: order1.id,
      userId: admin.id,
      actor: 'GEMINI_VISION_GATEWAY_MONITOR',
      event: 'UPSTREAM_AI_VISION_DEGRADED',
      action: 'ROUTE_TO_MANUAL_TRIAGE',
      result: 'ROUTED_MANUAL_QUEUE',
      metadata: {
        reason: 'Gemini 2.5 Vision endpoint returned HTTP 503 / 429 rate limit timeout.',
        actionRequired: 'Manual Ops certification of receiver stamp & SKU line items.',
        targetQueue: 'AWAITING_MANUAL_TRIAGE',
      },
      timestamp: new Date(Date.now() - 1800 * 1000),
    },
  ]);

  console.log(`✓ Created Order 1 (Manual Vision Triage): ${tx1Number} (ID: ${order1.id})`);

  // ════════════════════════════════════════════════════════════════════════════
  // ORDER 2: DEMO FOR CARRIER OUTAGE -> CONSIGNEE MANUAL ATTESTATION WITH GPS
  // ════════════════════════════════════════════════════════════════════════════
  const tx2Number = 'RC-RESIL-CARRIER-402';
  const po2Number = 'PO-2026-LOG-402';

  const [existing2] = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.transactionNumber, tx2Number))
    .limit(1);

  if (existing2) {
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.transactionId, existing2.id));
    await db.delete(schema.contracts).where(eq(schema.contracts.transactionId, existing2.id));
    await db.delete(schema.documents).where(eq(schema.documents.transactionId, existing2.id));
    await db.delete(schema.paymentReservations).where(eq(schema.paymentReservations.transactionId, existing2.id));
    await db.delete(schema.transactions).where(eq(schema.transactions.id, existing2.id));
  }

  const [order2] = await db
    .insert(schema.transactions)
    .values({
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
      createdAt: new Date(Date.now() - 3600 * 1000 * 8), // 8 hours ago
    })
    .returning();

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
      timestamp: new Date(Date.now() - 3600 * 1000 * 8),
    },
    {
      transactionId: order2.id,
      userId: seller.id,
      actor: seller.email,
      event: 'SHIPMENT_DISPATCHED',
      action: 'DISPATCH_CARRIER',
      result: 'SUCCESS',
      metadata: { carrier: 'BlueDart Express', awb: 'BD-9821471029-IN' },
      timestamp: new Date(Date.now() - 3600 * 1000 * 6),
    },
    {
      transactionId: order2.id,
      userId: admin.id,
      actor: 'CARRIER_TELEMETRY_WATCHDOG',
      event: 'CARRIER_GATEWAY_UNAVAILABLE',
      action: 'SET_CARRIER_UNVERIFIED',
      result: 'FALLBACK_REQUIRED',
      metadata: {
        carrier: 'BlueDart Express',
        error: 'Carrier webhook timeout (HTTP 504) > 45 minutes.',
        fallbackRequirement: 'Manual Consignee Attestation with GPS stamp required to release escrow.',
      },
      timestamp: new Date(Date.now() - 3600 * 1000 * 2),
    },
  ]);

  console.log(`✓ Created Order 2 (Consignee Attestation / Carrier Outage): ${tx2Number} (ID: ${order2.id})`);

  // ════════════════════════════════════════════════════════════════════════════
  // ORDER 3: DEMO FOR RAZORPAY/RBI NODAL OUTAGE -> OVERNIGHT BATCH SETTLEMENT
  // ════════════════════════════════════════════════════════════════════════════
  const tx3Number = 'RC-RESIL-NODAL-770';
  const po3Number = 'PO-2026-BANK-770';

  const [existing3] = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.transactionNumber, tx3Number))
    .limit(1);

  if (existing3) {
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.transactionId, existing3.id));
    await db.delete(schema.contracts).where(eq(schema.contracts.transactionId, existing3.id));
    await db.delete(schema.documents).where(eq(schema.documents.transactionId, existing3.id));
    await db.delete(schema.verificationResults).where(eq(schema.verificationResults.transactionId, existing3.id));
    await db.delete(schema.securityChecks).where(eq(schema.securityChecks.transactionId, existing3.id));
    await db.delete(schema.paymentReservations).where(eq(schema.paymentReservations.transactionId, existing3.id));
    await db.delete(schema.transactions).where(eq(schema.transactions.id, existing3.id));
  }

  const [order3] = await db
    .insert(schema.transactions)
    .values({
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
      createdAt: new Date(Date.now() - 3600 * 1000 * 12), // 12 hours ago
    })
    .returning();

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
      timestamp: new Date(Date.now() - 3600 * 1000 * 12),
    },
    {
      transactionId: order3.id,
      userId: admin.id,
      actor: 'AI_VERIFICATION_ENGINE',
      event: 'DELIVERY_VERIFIED_100_PERCENT',
      action: 'AUTO_VERIFY',
      result: 'APPROVED',
      metadata: { confidence: 0.99, checksPassed: 5 },
      timestamp: new Date(Date.now() - 3600 * 1000 * 3),
    },
    {
      transactionId: order3.id,
      userId: admin.id,
      actor: 'NODAL_CLEARING_CIRCUIT_BREAKER',
      event: 'PAYMENT_GATEWAY_MAINTENANCE_QUEUED',
      action: 'QUEUE_OVERNIGHT_BATCH',
      result: 'SETTLEMENT_QUEUED',
      metadata: {
        reason: 'Razorpay / RBI Nodal RTGS gateway offline for scheduled maintenance.',
        action: 'Buffered to Overnight Settlement Batch queue.',
        idempotencyHash: crypto.createHash('sha256').update(`batch-${order3.id}-2500000`).digest('hex').slice(0, 16),
      },
      timestamp: new Date(Date.now() - 3600 * 1000 * 1),
    },
  ]);

  console.log(`✓ Created Order 3 (Overnight Batch Settlement / Nodal Outage): ${tx3Number} (ID: ${order3.id})`);

  console.log('--- Seeding Completed Successfully! ---');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding resilience demo orders:', err);
    process.exit(1);
  });
