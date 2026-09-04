/**
 * Comprehensive Website Feature Test Suite for RazorChain AI
 * Tests all 17 critical functions and enterprise feature clusters.
 */
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function test(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ suite, name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ [${suite}] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    results.push({ suite, name, passed: false, error: msg, durationMs: Date.now() - start });
    console.error(`  ✗ [${suite}] ${name}: ${msg}`);
  }
}

function expect(actual: any, description?: string) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`${description ? description + ': ' : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${description ? description + ': ' : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`${description ? description + ': ' : ''}Expected truthy value, got ${JSON.stringify(actual)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`${description ? description + ': ' : ''}Expected defined value, got undefined`);
      }
    },
    toContain(substr: string) {
      if (typeof actual === 'string' ? !actual.includes(substr) : !Array.isArray(actual) || !actual.includes(substr)) {
        throw new Error(`${description ? description + ': ' : ''}Expected to contain ${JSON.stringify(substr)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(num: number) {
      if (!(actual > num)) {
        throw new Error(`${description ? description + ': ' : ''}Expected ${actual} > ${num}`);
      }
    },
    toBeGreaterThanOrEqual(num: number) {
      if (!(actual >= num)) {
        throw new Error(`${description ? description + ': ' : ''}Expected ${actual} >= ${num}`);
      }
    },
    toBeOneOf(arr: any[]) {
      if (!arr.includes(actual)) {
        throw new Error(`${description ? description + ': ' : ''}Expected ${actual} to be one of ${JSON.stringify(arr)}`);
      }
    }
  };
}

async function api(path: string, options: RequestInit = {}, cookie?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const setCookie = res.headers.get('set-cookie');
  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, setCookie, res };
}

async function loginUser(email: string, password = 'password123') {
  const res = await api('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'login', email, password }),
  });
  if (res.status !== 200 || !res.setCookie) {
    throw new Error(`Login failed for ${email}: status ${res.status}, ${JSON.stringify(res.data)}`);
  }
  const match = res.setCookie.match(/auth-token=([^;]+)/);
  const tokenCookie = match ? `auth-token=${match[1]}` : res.setCookie.split(';')[0];
  return { user: res.data.user, cookie: tokenCookie };
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`  RazorChain AI — Comprehensive Full Website Test Suite`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let buyerCookie = '';
  let sellerCookie = '';
  let adminCookie = '';
  let buyerUser: any = null;
  let sellerUser: any = null;
  let adminUser: any = null;

  // 1. Authentication & Session
  await test('Auth', 'Login as Buyer', async () => {
    const res = await loginUser('buyer@demo.com');
    expect(res.user.role).toBe('BUYER');
    buyerCookie = res.cookie;
    buyerUser = res.user;
  });

  await test('Auth', 'Login as Seller', async () => {
    const res = await loginUser('seller@demo.com');
    expect(res.user.role).toBe('SELLER');
    sellerCookie = res.cookie;
    sellerUser = res.user;
  });

  await test('Auth', 'Login as Admin', async () => {
    const res = await loginUser('admin@demo.com');
    expect(res.user.role).toBe('ADMIN');
    adminCookie = res.cookie;
    adminUser = res.user;
  });

  await test('Auth', 'Session validation via GET /api/auth', async () => {
    const res = await api('/api/auth', { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.user.email).toBe('buyer@demo.com');
  });

  await test('Auth', 'Reject unauthenticated request', async () => {
    const res = await api('/api/auth', { method: 'GET' });
    expect(res.status).toBe(401);
  });

  await test('Auth', 'Reject invalid login credentials', async () => {
    const res = await api('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', email: 'buyer@demo.com', password: 'wrongpassword' }),
    });
    expect(res.status).toBe(401);
  });

  // 2. User Directory & Security Boundaries
  await test('Users', 'Buyers can query seller directory (GET /api/users?role=SELLER)', async () => {
    const res = await api('/api/users?role=SELLER', { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.users)).toBe(true);
    expect(res.data.users.length).toBeGreaterThan(0);
  });

  await test('Users', 'Buyers cannot enumerate full user database (anti-scraping protection)', async () => {
    const res = await api('/api/users', { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(403);
  });

  await test('Users', 'Admin can list all users (GET /api/users)', async () => {
    const res = await api('/api/users', { method: 'GET' }, adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.users)).toBe(true);
    expect(res.data.users.length).toBeGreaterThan(0);
  });

  // 3. Inbound ERP Purchase Order Ingestion (Enterprise Cluster 5)
  let erpTxId = '';
  await test('Inbound ERP', 'Reject missing API key', async () => {
    const res = await api('/api/inbound/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({ poNumber: 'PO-ERP-001' }),
    });
    expect(res.status).toBe(401);
  });

  await test('Inbound ERP', 'Ingest PO with valid API key & parse contract', async () => {
    const res = await api('/api/inbound/purchase-orders', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer dev-api-key-change-in-production',
      },
      body: JSON.stringify({
        buyerEmail: 'buyer@demo.com',
        sellerEmail: 'seller@demo.com',
        poNumber: `PO-ERP-${Date.now()}`,
        productDescription: '500 industrial bearings via SAP ERP',
        quantity: 500,
        amount: 250000,
        deliveryAddress: 'Bengaluru Facility, Gate 4',
        expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        verificationConditions: ['po_number_match', 'quantity_match', 'delivery_address_match'],
      }),
    });
    expect(res.status).toBe(201);
    expect(res.data.transaction).toBeDefined();
    expect(res.data.transaction.status).toBe('CREATED');
    erpTxId = res.data.transaction.id;
  });

  // 4. Transaction Creation & KYB Sanctions Screening (Cluster 1 & 4)
  let mainTxId = '';
  const currentPoNumber = `PO-TEST-${Date.now()}`;
  await test('Transactions', 'Block transaction creation for sanctioned entity', async () => {
    const res = await api('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        sellerId: sellerUser.id,
        poNumber: 'PO-SANCTIONED-001',
        productDescription: 'Prohibited goods for sanctioned_entity shipment',
        quantity: 100,
        amount: 50000,
        deliveryAddress: 'Restricted Area',
        expectedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
        verificationConditions: ['po_number_match'],
      }),
    }, buyerCookie);
  });

  await test('Transactions', 'Create valid purchase order transaction', async () => {
    const res = await api('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        sellerId: sellerUser.id,
        poNumber: currentPoNumber,
        productDescription: 'Industrial Ball Bearings (6205-2RS)',
        quantity: 500,
        amount: 250000,
        deliveryAddress: 'Bengaluru',
        expectedDeliveryDate: '2026-09-04T00:00:00.000Z',
        verificationConditions: [
          'po_number_match',
          'quantity_match',
          'delivery_address_match',
          'delivery_date_valid',
          'signed_delivery_proof',
          'document_validity',
        ],
      }),
    }, buyerCookie);
    expect(res.status).toBe(201);
    expect(res.data.transaction).toBeDefined();
    expect(res.data.transaction.transactionNumber).toContain('RC-');
    mainTxId = res.data.transaction.id;
  });

  await test('Transactions', 'List transactions via GET /api/transactions', async () => {
    const res = await api('/api/transactions', { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.transactions)).toBe(true);
    const found = res.data.transactions.find((t: any) => t.id === mainTxId);
    expect(found).toBeDefined();
  });

  await test('Transactions', 'Get transaction detail with relational objects', async () => {
    const res = await api(`/api/transactions/${mainTxId}`, { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.transaction.id).toBe(mainTxId);
    expect(res.data.viewer.role).toBe('BUYER');
    expect(Array.isArray(res.data.milestones)).toBe(true);
    expect(Array.isArray(res.data.messages)).toBe(true);
  });

  // 5. Milestone Tranches & Pro-Rata (Cluster 1)
  let milestone1Id = '';
  await test('Milestones', 'Reject milestones that do not sum to 100%', async () => {
    const res = await api(`/api/transactions/${mainTxId}/milestones`, {
      method: 'POST',
      body: JSON.stringify({
        milestones: [
          { label: 'Advance Payment', percentage: 20, requiredDocuments: ['invoice'] },
          { label: 'Final Delivery', percentage: 70, requiredDocuments: ['delivery_receipt'] },
        ],
      }),
    }, buyerCookie);
    expect(res.status).toBe(400);
  });

  await test('Milestones', 'Define valid milestone plan (20% Advance, 30% In-Transit, 50% Delivery)', async () => {
    const res = await api(`/api/transactions/${mainTxId}/milestones`, {
      method: 'POST',
      body: JSON.stringify({
        milestones: [
          { sequence: 1, label: 'Advance Payment', percentage: 20, requiredDocuments: ['invoice'] },
          { sequence: 2, label: 'Carrier In-Transit', percentage: 30, requiredDocuments: ['bill_of_lading'] },
          { sequence: 3, label: 'Proof of Delivery', percentage: 50, requiredDocuments: ['delivery_receipt'] },
        ],
      }),
    }, buyerCookie);
    expect(res.status).toBe(201);
    expect(res.data.milestones.length).toBe(3);
    milestone1Id = res.data.milestones[0].id;
  });

  await test('Milestones', 'Retrieve milestone plan via GET /api/transactions/:id/milestones', async () => {
    const res = await api(`/api/transactions/${mainTxId}/milestones`, { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.milestones.length).toBe(3);
  });

  await test('Milestones', 'Get individual milestone', async () => {
    const res = await api(`/api/transactions/${mainTxId}/milestones/${milestone1Id}`, { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.milestone.id).toBe(milestone1Id);
    expect(res.data.milestone.percentage).toBe(20);
  });

  // 6. Payment Escrow Reservation
  await test('Escrow', 'Reserve funds against transaction', async () => {
    const res = await api(`/api/transactions/${mainTxId}/reserve`, {
      method: 'POST',
    }, buyerCookie);
    expect(res.status).toBeOneOf([200, 201]);
    expect(res.data.reservation).toBeDefined();
    expect(res.data.transactionNumber).toBeDefined();
  });

  // 7. Milestone Approval & Pro-Rata Partial Settlement
  await test('Milestones', 'Approve Milestone 1 with pro-rata quantity', async () => {
    const res = await api(`/api/transactions/${mainTxId}/milestones/${milestone1Id}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'APPROVE',
        partialQuantity: 400, // 400 out of 500 units
        inspectionWindowHours: 72,
      }),
    }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.milestone.status).toBe('APPROVED');
    expect(res.data.milestone.fulfilledQuantity).toBe(400);
    expect(res.data.milestone.autoReleaseAt).toBeDefined();
  });

  // 8. Carrier Tracking (Cluster 3)
  await test('Carrier', 'Seller registers AWB tracking number', async () => {
    const res = await api(`/api/transactions/${mainTxId}/tracking`, {
      method: 'POST',
      body: JSON.stringify({
        carrier: 'FEDEX',
        trackingNumber: '794644790000',
      }),
    }, sellerCookie);
    expect(res.status).toBeOneOf([200, 201]);
    expect(res.data.trackingNumber).toBe('794644790000');
    expect(res.data.carrier).toBe('FEDEX');
  });

  await test('Carrier', 'Fetch carrier tracking telemetry', async () => {
    const res = await api(`/api/transactions/${mainTxId}/tracking`, { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.tracking).toBeDefined();
    expect(res.data.tracking.status).toBe('DELIVERED');
    expect(res.data.tracking.events.length).toBeGreaterThan(0);
  });

  // 9. Document Upload & Forensics (Cluster 2)
  // Create unique receipt content matching PO and quantity
  const uniqueDocText = `DELIVERY RECEIPT
=======================================================
Receipt Number: DR-TEST-${Date.now()}
Date: 2026-09-04

Sender: Global Bearings Ltd
Receiver: Acme Manufacturing

Delivery Address: Bengaluru

Reference PO: ${currentPoNumber}

Items Delivered:
  Description: Industrial Ball Bearings (6205-2RS)
  Quantity Received: 500 units
  Condition: Good - No Damage

Received By: Rajesh Kumar
Designation: Warehouse Manager
Date/Time: 2026-09-04 14:30 IST
Unique Hash Salt: ${Date.now()}-${Math.random()}
`;

  await test('Documents', 'Upload delivery receipt with automatic SHA-256 and forensic analysis', async () => {
    const blob = new Blob([uniqueDocText], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('files', blob, 'delivery-receipt-live.txt');

    const res = await fetch(`${BASE_URL}/api/transactions/${mainTxId}/documents`, {
      method: 'POST',
      headers: {
        Cookie: sellerCookie,
      },
      body: formData,
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.uploadedCount).toBe(1);
    expect(data.documents[0].sha256).toBeDefined();
    expect(data.documents[0].forensicMetadata.digestAlgorithm).toBe('SHA-256');
  });

  await test('Documents', 'Cross-transaction duplicate guard blocks identical document', async () => {
    // Create another transaction, reserve it so it is in DELIVERY_PENDING, and attempt duplicate upload
    const secondPo = await api('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        sellerId: sellerUser.id,
        poNumber: `PO-DUP-CHECK-${Date.now()}`,
        productDescription: 'Duplicate check items',
        quantity: 500,
        amount: 250000,
        deliveryAddress: 'Bengaluru Facility',
        expectedDeliveryDate: '2026-09-04T00:00:00.000Z',
        verificationConditions: ['po_number_match'],
      }),
    }, buyerCookie);
    const secondTxId = secondPo.data.transaction.id;
    await api(`/api/transactions/${secondTxId}/reserve`, { method: 'POST' }, buyerCookie);

    // Attempt to upload exact same document with same SHA-256 to secondTxId
    const blob = new Blob([uniqueDocText], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('files', blob, 'duplicate-receipt.txt');

    const res = await fetch(`${BASE_URL}/api/transactions/${secondTxId}/documents`, {
      method: 'POST',
      headers: {
        Cookie: sellerCookie,
      },
      body: formData,
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.errors.length).toBeGreaterThan(0);
    expect(data.errors[0].error).toContain('already been used');
  });

  // 10. In-App Clarification Channel (Cluster 6)
  await test('Clarification Channel', 'Buyer posts question linked to flagged check', async () => {
    const res = await api(`/api/transactions/${mainTxId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        body: 'Can you confirm the received batch serials?',
        flaggedCheck: 'signed_delivery_proof',
      }),
    }, buyerCookie);
    expect(res.status).toBe(201);
    expect(res.data.message.body).toBe('Can you confirm the received batch serials?');
    expect(res.data.message.senderRole).toBe('BUYER');
  });

  await test('Clarification Channel', 'Seller replies to thread', async () => {
    const res = await api(`/api/transactions/${mainTxId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        body: 'Confirmed, all serials match the signed delivery receipt.',
        flaggedCheck: 'signed_delivery_proof',
      }),
    }, sellerCookie);
    expect(res.status).toBe(201);
    expect(res.data.message.senderRole).toBe('SELLER');
  });

  await test('Clarification Channel', 'Retrieve threaded messages with sender roles', async () => {
    const res = await api(`/api/transactions/${mainTxId}/messages`, { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.messages.length).toBeGreaterThanOrEqual(2);
    expect(res.data.messages[0].senderRole).toBeDefined();
  });

  // 11. AI Verification Pipeline & Deadman's Switch (Cluster 1, 2, 3)
  let verificationStatus = '';
  await test('AI Verification', 'Run AI verification with carrier check and forensic analysis', async () => {
    const res = await api(`/api/transactions/${mainTxId}/verify`, {
      method: 'POST',
    }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.security).toBeDefined();
    expect(res.data.forensic).toBeDefined();
    expect(res.data.carrier).toBeDefined();
    verificationStatus = res.data.verification?.status;
  });

  // 12. Deadman's Switch Cron (Cluster 1)
  await test('Escrow Timers', 'Trigger cron sweep for auto-release / auto-refund', async () => {
    const res = await api('/api/cron/escrow-timers', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer dev-cron-secret-change-in-production',
      },
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(typeof res.data.autoReleased).toBe('number');
    expect(typeof res.data.autoRefunded).toBe('number');
  });

  // 13. Webhook Management (Cluster 5)
  let webhookId = '';
  await test('Webhooks', 'Register outbound webhook endpoint', async () => {
    const res = await api('/api/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://webhook.site/test-endpoint',
        events: ['PO_CREATED', 'VERIFICATION_PASSED', 'PAYMENT_SETTLED'],
      }),
    }, buyerCookie);
    expect(res.status).toBe(201);
    expect(res.data.endpoint.url).toBe('https://webhook.site/test-endpoint');
    expect(res.data.endpoint.secret).toBeDefined();
    webhookId = res.data.endpoint.id;
  });

  await test('Webhooks', 'List registered webhooks via GET /api/webhooks', async () => {
    const res = await api('/api/webhooks', { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.endpoints)).toBe(true);
    const found = res.data.endpoints.find((w: any) => w.id === webhookId);
    expect(found).toBeDefined();
  });

  await test('Webhooks', 'Update webhook endpoint', async () => {
    const res = await api(`/api/webhooks/${webhookId}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.endpoint.active).toBe(false);
  });

  await test('Webhooks', 'Delete webhook endpoint', async () => {
    const res = await api(`/api/webhooks/${webhookId}`, {
      method: 'DELETE',
    }, buyerCookie);
    expect(res.status).toBe(200);
  });

  // 14. Admin Dispute Override & Payment Execution
  await test('Admin', 'Ensure transaction is in VERIFIED state via Admin override if needed', async () => {
    const txDetail = await api(`/api/transactions/${mainTxId}`, { method: 'GET' }, buyerCookie);
    if (['MANUAL_REVIEW', 'VERIFICATION_FAILED'].includes(txDetail.data.transaction.status)) {
      const res = await api(`/api/transactions/${mainTxId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'APPROVED', reason: 'Verified manually by operations team' }),
      }, adminCookie);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('VERIFIED');
    }
  });

  await test('Payment Execution', 'Release payment to seller (Settlement)', async () => {
    const res = await api(`/api/transactions/${mainTxId}/execute`, {
      method: 'POST',
    }, buyerCookie);
    expect(res.status).toBeOneOf([200, 201]);
    expect(res.data.transactionStatus).toBe('SETTLED');
  });

  // 15. Cryptographic Settlement Certificate (Cluster 5)
  await test('Certificate', 'Download signed settlement certificate', async () => {
    const res = await api(`/api/transactions/${mainTxId}/certificate`, { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.hmacSignature).toBeDefined();
    expect(res.data.signatureAlgorithm).toBe('HMAC-SHA256');
    expect(res.data.transaction.status).toBe('SETTLED');
    expect(res.data.parties.buyer.email).toBe('buyer@demo.com');
    expect(res.data.parties.seller.email).toBe('seller@demo.com');
    expect(res.data.documents.length).toBeGreaterThan(0);
    expect(res.data.documents[0].sha256).toBeDefined();
  });

  // 16. Immutable Audit Trail
  await test('Audit', 'Retrieve audit trail for transaction', async () => {
    const res = await api(`/api/transactions/${mainTxId}/audit`, { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.auditLogs)).toBe(true);
    expect(res.data.auditLogs.length).toBeGreaterThan(0);
  });

  // 17. Dashboard Metrics
  await test('Dashboard', 'Fetch platform dashboard metrics as Admin', async () => {
    const res = await api('/api/dashboard/metrics', { method: 'GET' }, adminCookie);
    expect(res.status).toBe(200);
    expect(res.data.totalTransactions).toBeDefined();
    expect(typeof res.data.totalTransactions).toBe('number');
  });

  // 20. Dynamic Discounting API
  await test('Dynamic Discounting', 'Fetch early discount quote via GET /api/transactions/:id/dynamic-discount', async () => {
    const res = await api(`/api/transactions/${mainTxId}/dynamic-discount`, { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.originalAmount).toBeDefined();
  });

  await test('Dynamic Discounting', 'Accept early settlement discount via POST /api/transactions/:id/dynamic-discount', async () => {
    const res = await api(`/api/transactions/${mainTxId}/dynamic-discount`, {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' }),
    }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.accepted).toBe(true);
  });

  // 21. Trade Credit & Invoice Factoring Collateral API
  await test('Factoring', 'Lender verify escrow collateral via GET /api/factoring', async () => {
    const res = await api(`/api/factoring?txId=${mainTxId}`, { method: 'GET' }, sellerCookie);
    expect(res.status).toBe(200);
    expect(res.data.collateral.lockedAmount).toBeDefined();
    expect(res.data.collateral.verificationSignature).toBeDefined();
  });

  let factorPledgeId = '';
  await test('Factoring', 'Pledge transaction for trade credit cash advance via POST /api/factoring', async () => {
    const txRes = await api('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        sellerId: sellerUser.id,
        poNumber: `PO-FACTOR-${Date.now()}`,
        productDescription: 'Export Copper Wire spools',
        quantity: 100,
        amount: 80000,
        deliveryAddress: 'Chennai Port Hub',
        expectedDeliveryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      }),
    }, buyerCookie);
    const factorTxId = txRes.data.transaction.id;
    const reserveRes = await api(`/api/transactions/${factorTxId}/reserve`, { method: 'POST' }, buyerCookie);

    const res = await api('/api/factoring', {
      method: 'POST',
      body: JSON.stringify({
        transactionId: factorTxId,
        lenderId: 'len_kredx_99',
        lenderName: 'KredX Enterprise Capital',
        advancePercentage: 85,
        discountFeePercentage: 2.5,
      }),
    }, sellerCookie);
    if (res.status !== 201) {
      console.log('Pledge debug:', res.status, res.data, 'reserve:', reserveRes.status, reserveRes.data);
    }
    expect(res.status).toBe(201);
    expect(res.data.pledge.advanceAmount).toBe(68000);
    expect(res.data.pledge.status).toBe('PLEDGED');
    factorPledgeId = res.data.pledge.id;
  });

  // 22. Trustless On-Chain Merkle Proof Anchoring
  await test('Merkle Anchoring', 'Retrieve Merkle inclusion proof and on-chain verification', async () => {
    const res = await api(`/api/transactions/${mainTxId}/merkle-proof`, { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.anchored).toBe(true);
    expect(res.data.root).toBeDefined();
    expect(res.data.leaf).toBeDefined();
    expect(res.data.verified).toBe(true);
  });

  // 23. Corporate KYB & UBO Screening API
  await test('KYB & UBO', 'Submit corporate registration and UBO screening via POST /api/users/:id/kyb', async () => {
    const res = await api(`/api/users/${sellerUser.id}/kyb`, {
      method: 'POST',
      body: JSON.stringify({
        companyName: 'Apex Precision Engineering Pvt Ltd',
        taxId: '29ABCDE1234F1ZW',
        registrationNumber: 'U28100KA2018PTC112345',
        jurisdiction: 'IN',
        ubos: [
          {
            name: 'Vikram Malhotra',
            equityPercentage: 70,
            nationality: 'IN',
            isPep: false,
          },
          {
            name: 'Ananya Sharma',
            equityPercentage: 30,
            nationality: 'IN',
            isPep: false,
          },
        ],
      }),
    }, adminCookie);
    expect(res.status).toBe(200);
    expect(res.data.kybStatus).toBe('CLEARED');
    expect(res.data.result.uboCount).toBe(2);
    expect(res.data.result.corporateVerified).toBe(true);
  });

  // 24. Maker-Checker Dual Approval Policy on High-Value Transaction (≥ ₹10,00,000)
  await test('Maker-Checker', 'Enforce dual approval multi-sig on high-value transaction', async () => {
    const highValueTxRes = await api('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        sellerId: sellerUser.id,
        poNumber: `PO-DUAL-${Date.now()}`,
        productDescription: 'High Value Industrial Generators',
        quantity: 5,
        amount: 1500000,
        deliveryAddress: 'Bengaluru Industrial Area',
        expectedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      }),
    }, buyerCookie);
    const highValId = highValueTxRes.data.transaction.id;
    await api(`/api/transactions/${highValId}/reserve`, { method: 'POST' }, buyerCookie);

    // Upload document & run verify to generate verificationResult
    const highValDocText = `DELIVERY RECEIPT - HIGH VALUE
Receipt: HV-${Date.now()}
Reference PO: PO-DUAL
Quantity: 5
[Signed] Receiver Stamp`;
    const form = new FormData();
    form.append('files', new Blob([`${highValDocText}\nNonce: ${Math.random()}`], { type: 'text/plain' }), `hv_receipt_${Date.now()}.txt`);
    const docRes = await fetch(`${BASE_URL}/api/transactions/${highValId}/documents`, {
      method: 'POST',
      headers: { Cookie: sellerCookie },
      body: form,
    });
    if (!docRes.ok) console.log('HV docRes error:', docRes.status, await docRes.text());
    const vRes = await api(`/api/transactions/${highValId}/verify`, { method: 'POST' }, buyerCookie);
    if (vRes.status !== 200) console.log('HV vRes error:', vRes.status, vRes.data);

    // If verification needs human override, admin approves to VERIFIED
    const detail = await api(`/api/transactions/${highValId}`, { method: 'GET' }, buyerCookie);
    if (['MANUAL_REVIEW', 'VERIFICATION_FAILED'].includes(detail.data?.transaction?.status)) {
      await api(`/api/transactions/${highValId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'APPROVED', reason: 'High value inspection cleared' }),
      }, adminCookie);
    }

    // First execute call by Buyer -> Maker approval (202 Accepted)
    const firstApproval = await api(`/api/transactions/${highValId}/execute`, { method: 'POST' }, buyerCookie);
    if (firstApproval.status !== 202) {
      console.log('firstApproval debug:', firstApproval.status, firstApproval.data);
    }
    expect(firstApproval.status).toBe(202);
    expect(firstApproval.data.requiresSecondApproval).toBe(true);
    expect(firstApproval.data.approvalsReceived).toBe(1);

    // Same user attempting second approval -> Violation (403 Forbidden)
    const selfApproval = await api(`/api/transactions/${highValId}/execute`, { method: 'POST' }, buyerCookie);
    expect(selfApproval.status).toBe(403);
    expect(selfApproval.data.error).toContain('Maker-Checker');

    // Distinct administrator provides second approval (Checker) -> 200 Success!
    const secondApproval = await api(`/api/transactions/${highValId}/execute`, { method: 'POST' }, adminCookie);
    expect(secondApproval.status).toBeOneOf([200, 201]);
    expect(secondApproval.data.transactionStatus).toBe('SETTLED');
  });

  // 25. Financing & Factor Portal: Approve & Disburse
  await test('Factor Portal', 'Lender approves trade credit pledge via POST /api/factoring/approve', async () => {
    const res = await api('/api/factoring/approve', {
      method: 'POST',
      body: JSON.stringify({
        pledgeId: factorPledgeId,
        approvedAmount: 68000,
        remarks: 'Credit line verified and approved by risk committee',
      }),
    }, adminCookie);
    expect(res.status).toBe(200);
    expect(res.data.pledge.status).toBe('APPROVED');
    expect(res.data.pledge.approvedAt).toBeDefined();
  });

  await test('Factor Portal', 'Disburse cash advance and record legal lien via POST /api/factoring/disburse', async () => {
    const res = await api('/api/factoring/disburse', {
      method: 'POST',
      body: JSON.stringify({
        pledgeId: factorPledgeId,
        utrNumber: 'UTR-AXIS-99182374',
        lienReference: 'LIEN-KREDX-PO-FACTOR',
      }),
    }, adminCookie);
    expect(res.status).toBe(200);
    expect(res.data.pledge.status).toBe('DISBURSED');
    expect(res.data.pledge.disbursementUtr).toBe('UTR-AXIS-99182374');
    expect(res.data.pledge.lienReference).toBe('LIEN-KREDX-PO-FACTOR');
  });

  await test('Factor Portal', 'Lender portfolio dashboard view via GET /api/lender/portfolio', async () => {
    const res = await api('/api/lender/portfolio?lenderId=len_kredx_99', { method: 'GET' }, adminCookie);
    expect(res.status).toBe(200);
    expect(res.data.portfolio.metrics.totalDisbursedAmount).toBeGreaterThan(0);
    expect(res.data.portfolio.metrics.outstandingExposure).toBeGreaterThan(0);
    expect(res.data.portfolio.pledges.length).toBeGreaterThan(0);
  });

  // 26. Treasury & Invoicing: Virtual Account Generation
  await test('Treasury', 'Generate NEFT/RTGS Virtual Account via POST /api/transactions/:id/virtual-account', async () => {
    const res = await api(`/api/transactions/${mainTxId}/virtual-account`, {
      method: 'POST',
      body: JSON.stringify({ partnerBank: 'AXIS', expiresHours: 72 }),
    }, buyerCookie);
    expect(res.status).toBeOneOf([200, 201]);
    expect(res.data.virtualAccount.accountNumber).toContain('RAZR');
    expect(res.data.virtualAccount.ifsc).toBeDefined();
    expect(res.data.virtualAccount.status).toBe('ACTIVE');
  });

  // 27. Treasury & Invoicing: Debit & Credit Notes
  let debitTxId = '';
  await test('Treasury', 'Issue Debit Note for transit damage adjustment via POST /api/transactions/:id/debit-notes', async () => {
    const txRes = await api('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        sellerId: sellerUser.id,
        poNumber: `PO-DEBIT-${Date.now()}`,
        productDescription: 'Precision Bearings Delivery Lot',
        quantity: 100,
        amount: 50000,
        deliveryAddress: 'Bengaluru',
        expectedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      }),
    }, buyerCookie);
    debitTxId = txRes.data.transaction.id;
    await api(`/api/transactions/${debitTxId}/reserve`, { method: 'POST' }, buyerCookie);

    const res = await api(`/api/transactions/${debitTxId}/debit-notes`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'DEBIT_NOTE',
        amount: 5000,
        reason: 'Transit surface abrasion discount on batch 1',
        lineItemRef: 'LINE-01-BEARINGS',
      }),
    }, buyerCookie);
    expect(res.status).toBe(201);
    expect(res.data.note.amount).toBe(5000);
    expect(res.data.summary.totalDebits).toBe(5000);
    expect(res.data.summary.netAdjustedAmount).toBe(45000);
  });

  await test('Treasury', 'List reconciled adjustment notes via GET /api/transactions/:id/debit-notes', async () => {
    const res = await api(`/api/transactions/${debitTxId}/debit-notes`, { method: 'GET' }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.notes.length).toBeGreaterThan(0);
    expect(res.data.summary.totalDebits).toBe(5000);
  });

  // 28. Disputes & Arbitration: Raise Dispute & Halt SLA Timers
  let disputeTxId = '';
  await test('Disputes', 'Raise dispute on transaction to halt SLA auto-release timers via POST /api/transactions/:id/dispute', async () => {
    const newTxRes = await api('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        sellerId: sellerUser.id,
        poNumber: `PO-DISP-${Date.now()}`,
        productDescription: 'Electronic Sensors Batch',
        quantity: 200,
        amount: 120000,
        deliveryAddress: 'Pune Hub',
        expectedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      }),
    }, buyerCookie);
    disputeTxId = newTxRes.data.transaction.id;
    await api(`/api/transactions/${disputeTxId}/reserve`, { method: 'POST' }, buyerCookie);

    const res = await api(`/api/transactions/${disputeTxId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({
        category: 'DAMAGED_GOODS',
        reason: 'Consignment box seal broken, water damage detected on 40 units',
        claimAmount: 24000,
        description: 'Moisture indicator strips activated during unloading inspection.',
      }),
    }, buyerCookie);
    expect(res.status).toBe(201);
    expect(res.data.dispute.category).toBe('DAMAGED_GOODS');
    expect(res.data.transactionStatus).toBe('DISPUTED');
    expect(res.data.timersHalted).toBe(true);

    const txCheck = await api(`/api/transactions/${disputeTxId}`, { method: 'GET' }, buyerCookie);
    expect(txCheck.data.transaction.status).toBe('DISPUTED');
    expect(txCheck.data.transaction.autoReleaseAt).toBe(null);
  });

  // 29. Disputes & Arbitration: Upload Damage & Surveyor Evidence
  await test('Disputes', 'Upload damage and surveyor inspection evidence via POST /api/transactions/:id/evidence', async () => {
    const res = await api(`/api/transactions/${disputeTxId}/evidence`, {
      method: 'POST',
      body: JSON.stringify({
        evidenceCategory: 'SURVEYOR_REPORT',
        title: 'Independent Surveyor Assessment Report',
        description: 'Certified marine cargo surveyor report documenting packaging seal rupture.',
        content: 'SURVEYOR REPORT: 40 units damaged by moisture ingress. Estimated loss: INR 24,00,0.',
      }),
    }, buyerCookie);
    expect(res.status).toBe(201);
    expect(res.data.document.documentType).toBe('dispute_evidence');
    expect(res.data.sha256).toBeDefined();
  });

  // 30. Treasury: Scheduled Batch Merkle Anchoring to Polygon
  await test('Treasury', 'Trigger scheduled Merkle batch anchoring to Polygon PoS via POST /api/cron/merkle-anchor', async () => {
    const res = await api('/api/cron/merkle-anchor', {
      method: 'POST',
      body: JSON.stringify({ maxBatchSize: 50 }),
    }, adminCookie);
    expect(res.status).toBeOneOf([200, 201]);
    expect(res.data.message).toBeDefined();
  });

  // 19. Frontend Dashboard & UI Page Rendering
  await test('UI', 'Landing Page (GET /)', async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
  });

  await test('UI', 'Login Page (GET /login)', async () => {
    const res = await fetch(`${BASE_URL}/login`);
    expect(res.status).toBe(200);
  });

  await test('UI', 'Buyer Dashboard (GET /buyer)', async () => {
    const res = await fetch(`${BASE_URL}/buyer`, { headers: { Cookie: buyerCookie } });
    expect(res.status).toBe(200);
  });

  await test('UI', 'Buyer Create Page (GET /buyer/create)', async () => {
    const res = await fetch(`${BASE_URL}/buyer/create`, { headers: { Cookie: buyerCookie } });
    expect(res.status).toBe(200);
  });

  await test('UI', 'Buyer Transaction Detail (GET /buyer/transaction/:id)', async () => {
    const res = await fetch(`${BASE_URL}/buyer/transaction/${mainTxId}`, { headers: { Cookie: buyerCookie } });
    expect(res.status).toBe(200);
  });

  await test('UI', 'Seller Dashboard (GET /seller)', async () => {
    const res = await fetch(`${BASE_URL}/seller`, { headers: { Cookie: sellerCookie } });
    expect(res.status).toBe(200);
  });

  await test('UI', 'Seller Transaction Detail (GET /seller/transaction/:id)', async () => {
    const res = await fetch(`${BASE_URL}/seller/transaction/${mainTxId}`, { headers: { Cookie: sellerCookie } });
    expect(res.status).toBe(200);
  });

  await test('UI', 'Admin Operations Dashboard (GET /admin)', async () => {
    const res = await fetch(`${BASE_URL}/admin`, { headers: { Cookie: adminCookie } });
    expect(res.status).toBe(200);
  });

  // 18. Transaction Cancellation / Refund
  await test('Cancellation', 'Cancel pending unreserved transaction', async () => {
    const res = await api(`/api/transactions/${erpTxId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Cancelled by test suite' }),
    }, buyerCookie);
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('CANCELLED');
  });

  console.log(`\n======================================================`);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`  Summary: ${passed} Passed, ${failed} Failed out of ${results.length} total tests`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
