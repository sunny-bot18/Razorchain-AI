import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import * as schema from '../src/lib/db/schema';

async function seedTombstoneOrders() {
  console.log('--- Seeding Tombstone Mode Demonstration Orders ---');

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
    console.error('Demo users not found. Please run base seed first.');
    process.exit(1);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. CREATE DEDICATED TOMBSTONED USERS
  // ════════════════════════════════════════════════════════════════════════════
  const [tombstonedSeller] = await db
    .insert(schema.users)
    .values({
      email: 'tombstoned.seller901@redacted.internal',
      passwordHash: seller.passwordHash,
      name: '[REDACTED_ENTITY_901]',
      company: '[REDACTED_SELLER_CORP]',
      role: 'SELLER',
      isTombstoned: true,
      tombstonedAt: new Date('2026-08-01T10:30:00.000Z'),
      tombstoneReason: 'Right to be Forgotten (DPDP/GDPR Art 17) request executed.',
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        isTombstoned: true,
        tombstonedAt: new Date('2026-08-01T10:30:00.000Z'),
        name: '[REDACTED_ENTITY_901]',
      },
    })
    .returning();

  const [tombstonedBuyer] = await db
    .insert(schema.users)
    .values({
      email: 'tombstoned.buyer552@redacted.internal',
      passwordHash: buyer.passwordHash,
      name: '[REDACTED_BUYER_552]',
      company: '[REDACTED_BUYER_CORP]',
      role: 'BUYER',
      isTombstoned: true,
      tombstonedAt: new Date('2026-08-15T16:45:00.000Z'),
      tombstoneReason: 'Right to be Forgotten (DPDP/GDPR Art 17) request executed.',
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        isTombstoned: true,
        tombstonedAt: new Date('2026-08-15T16:45:00.000Z'),
        name: '[REDACTED_BUYER_552]',
      },
    })
    .returning();

  // ════════════════════════════════════════════════════════════════════════════
  // 2. ORDER 1: RC-TOMB-SELLER-901 (Tombstoned Seller & Shredded Documents)
  // ════════════════════════════════════════════════════════════════════════════
  const tx1Number = 'RC-TOMB-SELLER-901';
  const po1Number = 'PO-2026-TOMB-901';

  const [existing1] = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.transactionNumber, tx1Number))
    .limit(1);

  if (existing1) {
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.transactionId, existing1.id));
    await db.delete(schema.contracts).where(eq(schema.contracts.transactionId, existing1.id));
    await db.delete(schema.documents).where(eq(schema.documents.transactionId, existing1.id));
    await db.delete(schema.paymentExecutions).where(eq(schema.paymentExecutions.transactionId, existing1.id));
    await db.delete(schema.paymentReservations).where(eq(schema.paymentReservations.transactionId, existing1.id));
    await db.delete(schema.transactions).where(eq(schema.transactions.id, existing1.id));
  }

  const [order1] = await db
    .insert(schema.transactions)
    .values({
      transactionNumber: tx1Number,
      buyerId: buyer.id,
      sellerId: tombstonedSeller.id,
      poNumber: po1Number,
      productDescription: '400x Aerospace Turbine Flanges (Inconel 718 High-Temp)',
      quantity: 400,
      amount: 1500000,
      deliveryAddress: 'Hangar 7, HAL Aerospace Special Economic Zone, Bengaluru 560017',
      expectedDeliveryDate: new Date('2026-03-15T00:00:00.000Z'),
      verificationConditions: ['PO Match', 'Quantity Match', 'Address Match', 'Date Valid', 'Signed Delivery Proof'],
      status: 'SETTLED',
      requiresDualApproval: true,
      firstApproverId: buyer.id,
      firstApprovedAt: new Date('2026-03-16T12:00:00.000Z'),
      secondApproverId: tombstonedSeller.id,
      secondApprovedAt: new Date('2026-03-16T13:30:00.000Z'),
      currency: 'INR',
      merkleRoot: '0x8f4c2e1a9b7d3f5e6a8c0d2b4f6e8a0c2e4b6d8f0a2c4e6b8d0f2a4c6e8b0d2f',
      createdAt: new Date('2026-03-10T08:00:00.000Z'),
    })
    .returning();

  await db.insert(schema.contracts).values({
    transactionId: order1.id,
    poNumber: po1Number,
    requiredQuantity: 400,
    amount: 1500000,
    deliveryAddress: 'Hangar 7, HAL Aerospace Special Economic Zone, Bengaluru 560017',
    expectedDeliveryDate: new Date('2026-03-15T00:00:00.000Z'),
    requiredChecks: ['po_number_match', 'quantity_match', 'delivery_address_match', 'delivery_date_valid', 'signed_delivery_proof'],
    tolerances: { quantity_tolerance_percent: 0, delivery_date_tolerance_days: 1 },
  });

  await db.insert(schema.paymentExecutions).values({
    transactionId: order1.id,
    idempotencyKey: 'payout-tomb-seller-901-settled',
    action: 'DISBURSE',
    amount: 1500000,
    status: 'SUCCESS',
    executedAt: new Date('2026-03-16T14:30:00.000Z'),
    razorpayResponse: { utr: 'UTR_RBI_NODAL_8829103948', status: 'SETTLED', mode: 'RTGS' },
  });

  // Shredded documents for Order 1
  await db.insert(schema.documents).values([
    {
      transactionId: order1.id,
      fileName: 'commercial_tax_invoice_apex_turbine.pdf',
      fileType: 'application/pdf',
      filePath: '/tmp/shredded_invoice.pdf',
      fileSize: 420000,
      documentType: 'invoice',
      sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      isShredded: true,
      shreddedAt: new Date('2026-08-01T10:30:00.000Z'),
      dekKeyId: 'kms-dek-shredded-901-d8f92',
      shreddedReason: 'DPDP / GDPR Article 17 Right to be Forgotten statutory erasure executed.',
    },
    {
      transactionId: order1.id,
      fileName: 'physical_delivery_challan_signed.jpg',
      fileType: 'image/jpeg',
      filePath: '/tmp/shredded_challan.jpg',
      fileSize: 215000,
      documentType: 'delivery_receipt',
      sha256: 'f0e1d2c3b4a5968778695a4b3c2d1e0f0123456789abcdef0123456789abcdef',
      isShredded: true,
      shreddedAt: new Date('2026-08-01T10:30:00.000Z'),
      dekKeyId: 'kms-dek-shredded-901-d8f92',
      shreddedReason: 'DPDP / GDPR Article 17 Right to be Forgotten statutory erasure executed.',
    },
  ]);

  await db.insert(schema.auditLogs).values([
    {
      transactionId: order1.id,
      userId: buyer.id,
      actor: buyer.email,
      event: 'BUYER_MULTISIG_SIGNATURE_RECORDED',
      action: 'SIGN_RELEASE_APPROVE',
      result: 'FIRST_APPROVAL_RECORDED',
      metadata: { role: 'BUYER', threshold: 1000000, amount: 1500000, note: 'Buyer authorization recorded.' },
      timestamp: new Date('2026-03-16T12:00:00.000Z'),
    },
    {
      transactionId: order1.id,
      userId: tombstonedSeller.id,
      actor: 'seller@demo.com',
      event: 'SELLER_MULTISIG_SIGNATURE_RECORDED',
      action: 'SIGN_RELEASE_APPROVE',
      result: 'SECOND_APPROVAL_RECORDED',
      metadata: { role: 'SELLER', threshold: 1000000, amount: 1500000, note: 'Seller co-sign recorded. Multi-Sig quorum (2/2) satisfied.' },
      timestamp: new Date('2026-03-16T13:30:00.000Z'),
    },
    {
      transactionId: order1.id,
      userId: buyer.id,
      actor: buyer.email,
      event: 'ESCROW_SETTLED',
      action: 'PAYMENT_SETTLED',
      result: 'SUCCESS',
      metadata: { amount: 1500000, utr: 'UTR_RBI_NODAL_8829103948' },
      timestamp: new Date('2026-03-16T14:30:00.000Z'),
    },
    {
      transactionId: order1.id,
      userId: admin.id,
      actor: 'COMPLIANCE_PRIVACY_OFFICER',
      event: 'STATUTORY_DATA_ERASURE_EXECUTED',
      action: 'TOMBSTONE_ENTITY_AND_SHRED_KEYS',
      result: 'KMS_DEK_REVOKED',
      metadata: {
        targetEntity: '[REDACTED_ENTITY_901]',
        reason: 'Right to be Forgotten (DPDP/GDPR Art 17) request executed.',
        dekKeyId: 'kms-dek-shredded-901-d8f92',
        statutoryRetention: 'Double-entry ledger & Merkle root hash proofs preserved for 7-year RBI compliance.',
      },
      timestamp: new Date('2026-08-01T10:30:00.000Z'),
    },
  ]);

  console.log(`✓ Seeded Order 1 (Tombstoned Seller & Shredded Keys): ${tx1Number} (ID: ${order1.id})`);

  // ════════════════════════════════════════════════════════════════════════════
  // 3. ORDER 2: RC-TOMB-BUYER-552 (Tombstoned Buyer & Historic Statutory Ledger)
  // ════════════════════════════════════════════════════════════════════════════
  const tx2Number = 'RC-TOMB-BUYER-552';
  const po2Number = 'PO-2026-TOMB-552';

  const [existing2] = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.transactionNumber, tx2Number))
    .limit(1);

  if (existing2) {
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.transactionId, existing2.id));
    await db.delete(schema.contracts).where(eq(schema.contracts.transactionId, existing2.id));
    await db.delete(schema.documents).where(eq(schema.documents.transactionId, existing2.id));
    await db.delete(schema.paymentExecutions).where(eq(schema.paymentExecutions.transactionId, existing2.id));
    await db.delete(schema.paymentReservations).where(eq(schema.paymentReservations.transactionId, existing2.id));
    await db.delete(schema.transactions).where(eq(schema.transactions.id, existing2.id));
  }

  const [order2] = await db
    .insert(schema.transactions)
    .values({
      transactionNumber: tx2Number,
      buyerId: tombstonedBuyer.id,
      sellerId: seller.id,
      poNumber: po2Number,
      productDescription: '800x High-Grade Silicon Carbide Substrates (6-inch Wafer)',
      quantity: 800,
      amount: 3200000,
      deliveryAddress: 'Semiconductor Fabrication Park, Sanand GIDC, Gujarat 382110',
      expectedDeliveryDate: new Date('2026-04-20T00:00:00.000Z'),
      verificationConditions: ['PO Match', 'Quantity Match', 'Address Match', 'Date Valid', 'Signed Delivery Proof'],
      status: 'SETTLED',
      requiresDualApproval: true,
      firstApproverId: tombstonedBuyer.id,
      firstApprovedAt: new Date('2026-04-21T09:30:00.000Z'),
      secondApproverId: seller.id,
      secondApprovedAt: new Date('2026-04-21T10:45:00.000Z'),
      currency: 'INR',
      merkleRoot: '0x3a7b9c1d5e8f0a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b',
      createdAt: new Date('2026-04-15T09:00:00.000Z'),
    })
    .returning();

  await db.insert(schema.contracts).values({
    transactionId: order2.id,
    poNumber: po2Number,
    requiredQuantity: 800,
    amount: 3200000,
    deliveryAddress: 'Semiconductor Fabrication Park, Sanand GIDC, Gujarat 382110',
    expectedDeliveryDate: new Date('2026-04-20T00:00:00.000Z'),
    requiredChecks: ['po_number_match', 'quantity_match', 'delivery_address_match', 'delivery_date_valid', 'signed_delivery_proof'],
    tolerances: { quantity_tolerance_percent: 0, delivery_date_tolerance_days: 1 },
  });

  await db.insert(schema.paymentExecutions).values({
    transactionId: order2.id,
    idempotencyKey: 'payout-tomb-buyer-552-settled',
    action: 'DISBURSE',
    amount: 3200000,
    status: 'SUCCESS',
    executedAt: new Date('2026-04-21T11:00:00.000Z'),
    razorpayResponse: { utr: 'UTR_RBI_NODAL_9918234102', status: 'SETTLED', mode: 'RTGS' },
  });

  await db.insert(schema.auditLogs).values([
    {
      transactionId: order2.id,
      userId: tombstonedBuyer.id,
      actor: 'buyer@demo.com',
      event: 'BUYER_MULTISIG_SIGNATURE_RECORDED',
      action: 'SIGN_RELEASE_APPROVE',
      result: 'FIRST_APPROVAL_RECORDED',
      metadata: { role: 'BUYER', threshold: 1000000, amount: 3200000, note: 'Buyer authorization recorded.' },
      timestamp: new Date('2026-04-21T09:30:00.000Z'),
    },
    {
      transactionId: order2.id,
      userId: seller.id,
      actor: seller.email,
      event: 'SELLER_MULTISIG_SIGNATURE_RECORDED',
      action: 'SIGN_RELEASE_APPROVE',
      result: 'SECOND_APPROVAL_RECORDED',
      metadata: { role: 'SELLER', threshold: 1000000, amount: 3200000, note: 'Seller co-sign recorded. Multi-Sig quorum (2/2) satisfied.' },
      timestamp: new Date('2026-04-21T10:45:00.000Z'),
    },
    {
      transactionId: order2.id,
      userId: seller.id,
      actor: seller.email,
      event: 'ESCROW_SETTLED',
      action: 'PAYMENT_SETTLED',
      result: 'SUCCESS',
      metadata: { amount: 3200000, utr: 'UTR_RBI_NODAL_9918234102' },
      timestamp: new Date('2026-04-21T11:00:00.000Z'),
    },
    {
      transactionId: order2.id,
      userId: admin.id,
      actor: 'COMPLIANCE_PRIVACY_OFFICER',
      event: 'BUYER_PII_TOMBSTONED',
      action: 'TOMBSTONE_BUYER_RECORD',
      result: 'PII_ANONYMIZED',
      metadata: {
        targetEntity: '[REDACTED_BUYER_552]',
        reason: 'Right to be Forgotten request executed.',
        statutoryRetention: 'Tax invoices and ledger hash anchors preserved for 7-year audit.',
      },
      timestamp: new Date('2026-08-15T16:45:00.000Z'),
    },
  ]);

  console.log(`✓ Seeded Order 2 (Tombstoned Buyer & Historic Ledger): ${tx2Number} (ID: ${order2.id})`);

  console.log('--- Tombstone Demonstration Orders Ready ---');
  console.log(
    JSON.stringify(
      {
        tombstonedSellerOrder: {
          id: order1.id,
          number: tx1Number,
          url: `/buyer/transaction/${order1.id}`,
        },
        tombstonedBuyerOrder: {
          id: order2.id,
          number: tx2Number,
          url: `/buyer/transaction/${order2.id}`,
        },
      },
      null,
      2
    )
  );
}

seedTombstoneOrders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding tombstone demo orders:', err);
    process.exit(1);
  });
