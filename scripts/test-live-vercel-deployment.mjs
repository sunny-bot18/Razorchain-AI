/**
 * Comprehensive End-to-End Verification Test Suite
 * Target: RazorChain AI Live Vercel Deployment (https://razorchain-ai.vercel.app)
 *
 * Tests every counterparty function, UI route, API endpoint, and database mapping:
 * - Counterparty Auth Sessions (Buyer, Seller, Admin)
 * - Standard Order Lifecycle (PO Creation, Escrow Reserve, Logistics, Evidence Upload, AI Verification, Settlement, Certs, Merkle)
 * - High-Value Order Four-Eyes Maker-Checker Dual Multi-Sig Governance (>= ₹10,00,000)
 * - Invoice Factoring / Trade Credit Lifecycle (Pledge, Approval, Advance Disbursement)
 * - Dispute Lifecycle, SLA Hold Timers & Admin Resolution (Debit Notes)
 * - Admin Operations (Key Pool, Metrics, Batch Settlement, Crons, KYB)
 * - Frontend UI App Router Health Checks (All 10 Pages)
 */

const BASE_URL = process.env.BASE_URL || 'https://razorchain-ai.vercel.app';
const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret-change-in-production';
const RUN_ID = Math.floor(Math.random() * 90000 + 10000);

console.log(`\n================================================================`);
console.log(`RAZORCHAIN AI - LIVE VERCEL DEPLOYMENT VERIFICATION SUITE`);
console.log(`Target URL: ${BASE_URL}`);
console.log(`Run ID: ${RUN_ID} | Timestamp: ${new Date().toISOString()}`);
console.log(`================================================================\n`);

// Session store for cookies
const sessions = {
  buyer: { email: 'buyer@demo.com', password: 'password123', cookie: null, user: null },
  seller: { email: 'seller@demo.com', password: 'password123', cookie: null, user: null },
  admin: { email: 'admin@demo.com', password: 'password123', cookie: null, user: null },
};

const testResults = [];

function recordTest(phase, testName, passed, details = '') {
  testResults.push({ phase, testName, passed, details });
  const mark = passed ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${phase} > ${testName} ${details ? `(${details})` : ''}`);
}

async function request(path, options = {}, role = null) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (role && sessions[role]?.cookie) {
    headers.set('Cookie', sessions[role].cookie);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Capture Set-Cookie if present
  if (role && response.headers.has('set-cookie')) {
    const rawCookie = response.headers.get('set-cookie');
    const match = rawCookie.match(/auth-token=[^;]+/);
    if (match) {
      sessions[role].cookie = match[0];
    }
  }

  return response;
}

async function getJson(path, role = null, extraHeaders = {}) {
  const res = await request(path, { method: 'GET', headers: extraHeaders }, role);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function postJson(path, body, role = null, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  const res = await request(
    path,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
    role
  );
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function run() {
  try {
    // ------------------------------------------------------------------
    // PHASE 0: DATABASE SEED & CONNECTIVITY
    // ------------------------------------------------------------------
    console.log(`\n--- PHASE 0: DATABASE & SEED INITIALIZATION ---`);
    const seedRes = await getJson('/api/seed');
    recordTest(
      'Phase 0',
      'Initialize and verify database seeding',
      seedRes.status === 200 && seedRes.data?.users?.length >= 3,
      `Users count: ${seedRes.data?.users?.length}`
    );

    // ------------------------------------------------------------------
    // PHASE 1: AUTHENTICATION & MULTI-ROLE SESSIONS
    // ------------------------------------------------------------------
    console.log(`\n--- PHASE 1: AUTHENTICATION & SESSIONS ---`);

    // 1.1 Buyer Login
    const buyerLogin = await postJson('/api/auth', {
      action: 'login',
      email: sessions.buyer.email,
      password: sessions.buyer.password,
    }, 'buyer');
    sessions.buyer.user = buyerLogin.data?.user;
    recordTest(
      'Phase 1',
      'Buyer login (buyer@demo.com)',
      buyerLogin.status === 200 && buyerLogin.data?.user?.role === 'BUYER',
      `ID: ${sessions.buyer.user?.id}`
    );

    // 1.2 Seller Login
    const sellerLogin = await postJson('/api/auth', {
      action: 'login',
      email: sessions.seller.email,
      password: sessions.seller.password,
    }, 'seller');
    sessions.seller.user = sellerLogin.data?.user;
    recordTest(
      'Phase 1',
      'Seller login (seller@demo.com)',
      sellerLogin.status === 200 && sellerLogin.data?.user?.role === 'SELLER',
      `ID: ${sessions.seller.user?.id}`
    );

    // 1.3 Admin Login
    const adminLogin = await postJson('/api/auth', {
      action: 'login',
      email: sessions.admin.email,
      password: sessions.admin.password,
    }, 'admin');
    sessions.admin.user = adminLogin.data?.user;
    recordTest(
      'Phase 1',
      'Admin login (admin@demo.com)',
      adminLogin.status === 200 && adminLogin.data?.user?.role === 'ADMIN',
      `ID: ${sessions.admin.user?.id}`
    );

    // 1.4 Profile check (/api/auth GET)
    const buyerAuthCheck = await getJson('/api/auth', 'buyer');
    recordTest(
      'Phase 1',
      'Session persistence (/api/auth GET)',
      buyerAuthCheck.status === 200 && buyerAuthCheck.data?.user?.email === 'buyer@demo.com'
    );

    // 1.5 Seller listing (/api/users?role=SELLER)
    const sellersList = await getJson('/api/users?role=SELLER', 'buyer');
    recordTest(
      'Phase 1',
      'Buyer seller-directory access (/api/users?role=SELLER)',
      sellersList.status === 200 && Array.isArray(sellersList.data?.users),
      `Found ${sellersList.data?.users?.length} sellers`
    );

    // ------------------------------------------------------------------
    // PHASE 2: STANDARD ORDER CREATION & ESCROW RESERVATION (ORDER 1)
    // ------------------------------------------------------------------
    console.log(`\n--- PHASE 2: STANDARD ORDER LIFECYCLE (ORDER 1) ---`);
    const poNumber1 = `PO-TEST-STD-${RUN_ID}`;
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    const createOrder1 = await postJson('/api/transactions', {
      sellerId: sessions.seller.user.id,
      poNumber: poNumber1,
      productDescription: 'High-Precision CNC Servo Actuators (Model AX-900)',
      quantity: 50,
      amount: 45000,
      deliveryAddress: 'Plant 4, Electronic City Phase 2, Bengaluru',
      expectedDeliveryDate: tomorrow,
      verificationConditions: ['PO Match', 'Quantity Match', 'Address Match', 'Date Valid', 'Signed Proof'],
      currency: 'INR',
    }, 'buyer');

    const order1 = createOrder1.data?.transaction;
    recordTest(
      'Phase 2',
      'Create Standard Purchase Order (amount: Rs. 45,000)',
      createOrder1.status === 201 && order1?.id && order1?.status === 'CREATED',
      `Tx: ${order1?.transactionNumber} | PO: ${poNumber1}`
    );

    // 2.2 Verify Detail & DB Contract Mapping
    const order1Detail = await getJson(`/api/transactions/${order1.id}`, 'buyer');
    recordTest(
      'Phase 2',
      'Verify DB Contract generation via ContractAgent',
      order1Detail.status === 200 && order1Detail.data?.contract?.poNumber === poNumber1,
      `Contract ID: ${order1Detail.data?.contract?.id}`
    );

    // 2.3 Reserve Escrow Funds
    const reserveOrder1 = await postJson(`/api/transactions/${order1.id}/reserve`, {}, 'buyer');
    recordTest(
      'Phase 2',
      'Lock Escrow Funds in Nodal Chamber (/reserve)',
      reserveOrder1.status === 201 && reserveOrder1.data?.reservation?.status === 'authorized',
      `Razorpay Order ID: ${reserveOrder1.data?.reservation?.razorpayOrderId}`
    );

    // Verify status updated to DELIVERY_PENDING
    const order1AfterReserve = await getJson(`/api/transactions/${order1.id}`, 'buyer');
    recordTest(
      'Phase 2',
      'Transaction state transitioned to DELIVERY_PENDING',
      order1AfterReserve.data?.transaction?.status === 'DELIVERY_PENDING'
    );

    // ------------------------------------------------------------------
    // PHASE 3: LOGISTICS TELEMETRY, EVIDENCE UPLOAD & AI VERIFICATION (ORDER 1)
    // ------------------------------------------------------------------
    console.log(`\n--- PHASE 3: LOGISTICS, EVIDENCE & AI VERIFICATION (ORDER 1) ---`);

    // 3.1 Seller Registers Carrier Tracking
    const trackingRes = await postJson(`/api/transactions/${order1.id}/tracking`, {
      carrier: 'BLUEDART',
      trackingNumber: `BD-TEST-${RUN_ID}-IN`,
    }, 'seller');
    recordTest(
      'Phase 3',
      'Seller registers carrier tracking (/tracking)',
      (trackingRes.status === 200 || trackingRes.status === 201) && trackingRes.data?.tracking?.status !== undefined,
      `Carrier: BLUEDART | Status: ${trackingRes.data?.tracking?.status}`
    );

    // 3.2 Buyer/Consignee Delivery Attestation
    const attestationRes = await postJson(`/api/transactions/${order1.id}/consignee-attestation`, {
      signatoryName: 'Rajesh Kumar',
      gpsCoordinates: {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 10.0,
      },
      documentName: 'Consignee Delivery Note',
      notes: 'All 50 servo units received intact at Electronic City plant gate.',
    }, 'buyer');
    recordTest(
      'Phase 3',
      'Consignee submits physical delivery attestation with GPS',
      attestationRes.status === 200 && attestationRes.data?.success === true,
      `Signatory: Rajesh Kumar | Location: 12.9716, 77.5946`
    );

    // 3.3 Seller Uploads Delivery Evidence (Challan / Receipt)
    const receiptContent = `DELIVERY RECEIPT
=======================================================
Receipt Number: DR-TEST-${RUN_ID}
Date: ${new Date().toISOString().split('T')[0]}

Sender: Apex Precision Engineering Ltd
Receiver: Acme Manufacturing Corp

Delivery Address: Plant 4, Electronic City Phase 2, Bengaluru

Reference PO: ${poNumber1}

Items Delivered:
  Description: High-Precision CNC Servo Actuators (Model AX-900)
  Quantity: 50 units
  Condition: Good - No Damage

Received By: Rajesh Kumar
Designation: Warehouse Manager
Date/Time: ${new Date().toISOString().split('T')[0]} 14:30 IST

Signature: [Signed]
Stamp: [Company Stamp Applied]

Notes: Consignment complete and verified against purchase order.
=======================================================`;

    const formData = new FormData();
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    formData.append('files', blob, `delivery_receipt_${RUN_ID}.txt`);

    const uploadRes = await request(
      `/api/transactions/${order1.id}/documents`,
      {
        method: 'POST',
        body: formData,
      },
      'seller'
    );
    const uploadData = await uploadRes.json().catch(() => null);
    recordTest(
      'Phase 3',
      'Seller uploads delivery proof (/documents)',
      uploadRes.status === 201 && uploadData?.documents?.length > 0,
      `Doc SHA-256: ${uploadData?.documents?.[0]?.sha256?.slice(0, 12)}...`
    );

    // 3.4 Verify Documents in DB
    const docsInDb = await getJson(`/api/transactions/${order1.id}/documents`, 'buyer');
    recordTest(
      'Phase 3',
      'Document DB persistence with Base64 forensic metadata',
      docsInDb.status === 200 && docsInDb.data?.documents?.length > 0
    );

    // 3.5 AI Multimodal Verification (VisionAgent + Aegis + VerificationEngine)
    console.log(`   Executing AI Multimodal Verification (Vision + Aegis + Contract)...`);
    const verifyRes = await postJson(`/api/transactions/${order1.id}/verify`, {}, 'buyer');
    const verifyDecision = verifyRes.data?.verification;
    recordTest(
      'Phase 3',
      'AI Multimodal Verification Engine (/verify)',
      verifyRes.status === 200 && (verifyDecision?.status === 'APPROVED' || verifyDecision?.status === 'MANUAL_REVIEW'),
      `Status: ${verifyDecision?.status} | Confidence: ${verifyDecision?.confidence}`
    );

    // Check transaction status
    const order1Verified = await getJson(`/api/transactions/${order1.id}`, 'buyer');
    recordTest(
      'Phase 3',
      'Transaction status updated after verification',
      ['VERIFIED', 'AWAITING_MANUAL_TRIAGE', 'MANUAL_REVIEW'].includes(order1Verified.data?.transaction?.status),
      `Status: ${order1Verified.data?.transaction?.status}`
    );

    // If status is MANUAL_REVIEW or AWAITING_MANUAL_TRIAGE, resolve it via Admin Override
    if (order1Verified.data?.transaction?.status !== 'VERIFIED') {
      console.log(`   Transaction in ${order1Verified.data?.transaction?.status}; applying Admin Resolution override...`);
      const resolveRes = await postJson(`/api/transactions/${order1.id}/resolve`, {
        decision: 'APPROVED',
        reason: 'Automated test suite verified physical consignment clean',
      }, 'admin');
      recordTest(
        'Phase 3',
        'Admin manual resolution override (/resolve)',
        resolveRes.status === 200 && resolveRes.data?.decision === 'APPROVED'
      );
    }

    // ------------------------------------------------------------------
    // PHASE 4: ESCROW DISBURSEMENT, CERTIFICATE & MERKLE PROOF (ORDER 1)
    // ------------------------------------------------------------------
    console.log(`\n--- PHASE 4: ESCROW DISBURSEMENT & CRYPTOGRAPHIC CERTS (ORDER 1) ---`);

    // 4.1 Execute Settlement Disbursement
    const executeRes = await postJson(`/api/transactions/${order1.id}/execute`, {}, 'buyer');
    recordTest(
      'Phase 4',
      'Disburse Escrow Settlement to Seller (/execute)',
      (executeRes.status === 200 || executeRes.status === 201) &&
        (executeRes.data?.transactionStatus === 'SETTLED' || executeRes.data?.execution?.status === 'captured'),
      `Status: ${executeRes.data?.transactionStatus || executeRes.data?.execution?.status}`
    );

    // 4.2 Settlement Certificate (JSON format)
    const certJsonRes = await getJson(`/api/transactions/${order1.id}/certificate?format=json`, 'buyer');
    recordTest(
      'Phase 4',
      'Download Settlement Certificate JSON with HMAC-SHA256 signature',
      certJsonRes.status === 200 && Boolean(certJsonRes.data?.hmacSignature),
      `Sign: ${certJsonRes.data?.hmacSignature?.slice(0, 16)}...`
    );

    // 4.3 Settlement Certificate (PDF Binary stream)
    const certPdfRes = await request(`/api/transactions/${order1.id}/certificate?format=pdf`, { method: 'GET' }, 'buyer');
    const pdfBlob = await certPdfRes.arrayBuffer();
    const isPdf = certPdfRes.headers.get('content-type')?.includes('application/pdf') && pdfBlob.byteLength > 500;
    recordTest(
      'Phase 4',
      'Download Settlement Certificate PDF Stream',
      certPdfRes.status === 200 && isPdf,
      `Size: ${(pdfBlob.byteLength / 1024).toFixed(1)} KB`
    );

    // 4.4 Merkle Audit Proof
    const merkleRes = await getJson(`/api/transactions/${order1.id}/merkle-proof`, 'buyer');
    recordTest(
      'Phase 4',
      'Merkle Audit Proof retrieval (/merkle-proof)',
      merkleRes.status === 200,
      `Anchored: ${merkleRes.data?.anchored}`
    );

    // ------------------------------------------------------------------
    // PHASE 5: HIGH-VALUE ORDER & FOUR-EYES MAKER-CHECKER (ORDER 2)
    // ------------------------------------------------------------------
    console.log(`\n--- PHASE 5: HIGH-VALUE FOUR-EYES GOVERNANCE (ORDER 2) ---`);
    const poNumber2 = `PO-TEST-HV-${RUN_ID}`;

    const createOrder2 = await postJson('/api/transactions', {
      sellerId: sessions.seller.user.id,
      poNumber: poNumber2,
      productDescription: 'Medical Grade Titanium Implants (Batch TS-400)',
      quantity: 1200,
      amount: 1500000, // Rs. 15,00,000 >= Rs. 10,00,000 threshold
      deliveryAddress: 'Logistics Hub 3, Hosur Road, Bengaluru',
      expectedDeliveryDate: tomorrow,
      verificationConditions: ['PO Match', 'Quantity Match', 'Consignee Signed Proof'],
      currency: 'INR',
    }, 'buyer');

    const order2 = createOrder2.data?.transaction;
    recordTest(
      'Phase 5',
      'Create High-Value Order (amount: Rs. 15,00,000)',
      createOrder2.status === 201 && order2?.requiresDualApproval === true,
      `requiresDualApproval: ${order2?.requiresDualApproval}`
    );

    // 5.2 Attempt escrow reserve WITHOUT dual multi-sig -> Expect 403
    const blockedReserve = await postJson(`/api/transactions/${order2.id}/reserve`, {}, 'buyer');
    recordTest(
      'Phase 5',
      'Escrow reservation blocked pending dual multi-sig authorization',
      blockedReserve.status === 403 && blockedReserve.data?.requiresDualApproval === true,
      `Expected 403: ${blockedReserve.status}`
    );

    // 5.3 Maker Signature (Buyer Step 1)
    const buyerSign = await postJson(`/api/transactions/${order2.id}/multisig`, { step: 1 }, 'buyer');
    recordTest(
      'Phase 5',
      'Buyer / Maker records 1st multi-sig authorization',
      buyerSign.status === 200 && buyerSign.data?.step === 1
    );

    // 5.4 Checker Signature (Seller Step 2)
    const sellerSign = await postJson(`/api/transactions/${order2.id}/multisig`, { step: 2 }, 'seller');
    recordTest(
      'Phase 5',
      'Seller / Checker records 2nd multi-sig authorization',
      sellerSign.status === 200 && sellerSign.data?.step === 2
    );

    // 5.5 Re-attempt Escrow Reservation -> Now succeeds!
    const allowedReserve = await postJson(`/api/transactions/${order2.id}/reserve`, {}, 'buyer');
    recordTest(
      'Phase 5',
      'Escrow reservation authorized following dual multi-sig signatures',
      allowedReserve.status === 201 && allowedReserve.data?.reservation?.status === 'authorized'
    );

    // ------------------------------------------------------------------
    // PHASE 6: INVOICE FACTORING & TRADE CREDIT LIFECYCLE (ORDER 3)
    // ------------------------------------------------------------------
    console.log(`\n--- PHASE 6: INVOICE FACTORING & TRADE CREDIT (ORDER 3) ---`);
    const poNumber3 = `PO-TEST-FACTOR-${RUN_ID}`;

    const createOrder3 = await postJson('/api/transactions', {
      sellerId: sessions.seller.user.id,
      poNumber: poNumber3,
      productDescription: 'Commercial Transformers & Inverters (100kVA)',
      quantity: 10,
      amount: 200000,
      deliveryAddress: 'Plot 12, Whitefield Industrial Area, Bengaluru',
      expectedDeliveryDate: tomorrow,
      verificationConditions: ['PO Match', 'Signed Proof'],
      currency: 'INR',
    }, 'buyer');
    const order3 = createOrder3.data?.transaction;
    await postJson(`/api/transactions/${order3.id}/reserve`, {}, 'buyer');

    // 6.1 Collateral Verification
    const collateralRes = await getJson(`/api/factoring?txId=${order3.id}`, 'seller');
    recordTest(
      'Phase 6',
      'Verify escrow collateral eligibility for factoring (/api/factoring GET)',
      collateralRes.status === 200 && collateralRes.data?.collateral?.maxEligibleAdvance > 0,
      `Max Advance: Rs. ${collateralRes.data?.collateral?.maxEligibleAdvance}`
    );

    // 6.2 Seller Pledges Receivables
    const pledgeRes = await postJson('/api/factoring', {
      transactionId: order3.id,
      lenderId: 'apex-liquidity-nbfc',
      lenderName: 'Apex Liquidity Capital NBFC',
      advancePercentage: 85,
      discountFeePercentage: 2.5,
    }, 'seller');
    const pledge = pledgeRes.data?.pledge;
    recordTest(
      'Phase 6',
      'Seller pledges transaction receivables (/api/factoring POST)',
      pledgeRes.status === 201 && pledge?.id,
      `Pledge ID: ${pledge?.id} | Advance: Rs. ${pledge?.advanceAmount}`
    );

    // 6.3 Lender / Admin Approves Pledge
    const approveFactoring = await postJson('/api/factoring/approve', {
      pledgeId: pledge.id,
      approvedAmount: 170000,
      discountFeePercentage: 2.5,
      remarks: 'Commercial collateral verified against irrevocable escrow.',
    }, 'admin');
    recordTest(
      'Phase 6',
      'Lender approves factoring advance (/api/factoring/approve)',
      approveFactoring.status === 200 && approveFactoring.data?.pledge?.status === 'APPROVED'
    );

    // 6.4 Lender / Admin Disburses Advance
    const disburseFactoring = await postJson('/api/factoring/disburse', {
      pledgeId: pledge.id,
      utrNumber: `UTR-FACTOR-${RUN_ID}-IND`,
      disbursedAmount: 170000,
      lienReference: `LIEN-FACTOR-${RUN_ID}`,
    }, 'admin');
    recordTest(
      'Phase 6',
      'Lender disburses factoring advance with UTR & Legal Lien (/api/factoring/disburse)',
      disburseFactoring.status === 200 && disburseFactoring.data?.pledge?.status === 'DISBURSED',
      `UTR: UTR-FACTOR-${RUN_ID}-IND`
    );

    // 6.5 Lender Portfolio check
    const portfolioRes = await getJson('/api/lender/portfolio', 'admin');
    recordTest(
      'Phase 6',
      'Lender portfolio reflects active trade credit pledges (/api/lender/portfolio)',
      portfolioRes.status === 200 && Array.isArray(portfolioRes.data?.portfolio?.pledges),
      `Pledges: ${portfolioRes.data?.portfolio?.pledges?.length}`
    );

    // ------------------------------------------------------------------
    // PHASE 7: DISPUTE LIFECYCLE, HOLD TIMERS & RESOLUTION (ORDER 4)
    // ------------------------------------------------------------------
    console.log(`\n--- PHASE 7: DISPUTE LIFECYCLE & DEBIT NOTES (ORDER 4) ---`);
    const poNumber4 = `PO-TEST-DISPUTE-${RUN_ID}`;

    const createOrder4 = await postJson('/api/transactions', {
      sellerId: sessions.seller.user.id,
      poNumber: poNumber4,
      productDescription: 'Custom Precision Castings (Alloy C-36)',
      quantity: 200,
      amount: 150000,
      deliveryAddress: 'Factory 2B, Peenya Industrial Area, Bengaluru',
      expectedDeliveryDate: tomorrow,
      verificationConditions: ['PO Match', 'Signed Proof'],
      currency: 'INR',
    }, 'buyer');
    const order4 = createOrder4.data?.transaction;
    await postJson(`/api/transactions/${order4.id}/reserve`, {}, 'buyer');

    // 7.1 Buyer Raises Dispute
    const disputeRes = await postJson(`/api/transactions/${order4.id}/dispute`, {
      category: 'SPECIFICATION_MISMATCH',
      reason: 'Batch inspection failed alloy metallurgical tolerance test.',
      claimAmount: 30000,
      description: 'Variance in tensile strength beyond 5% tolerance limit.',
    }, 'buyer');
    recordTest(
      'Phase 7',
      'Buyer raises dispute and halts escrow auto-release (/dispute)',
      disputeRes.status === 201 && disputeRes.data?.dispute?.status === 'OPEN',
      `Dispute ID: ${disputeRes.data?.dispute?.id}`
    );

    // 7.2 Admin Resolves Dispute
    const resolveDisputeRes = await postJson(`/api/transactions/${order4.id}/resolve`, {
      decision: 'APPROVED',
      reason: 'Seller agreed to 20% debit note adjustment and buyer accepted delivery.',
    }, 'admin');
    recordTest(
      'Phase 7',
      'Admin resolves dispute with audited rationale (/resolve)',
      resolveDisputeRes.status === 200 && resolveDisputeRes.data?.decision === 'APPROVED',
      `Decision: ${resolveDisputeRes.data?.decision} | New Status: ${resolveDisputeRes.data?.status}`
    );

    // 7.3 Check Debit Notes & Net Adjustments
    const debitNotesRes = await getJson(`/api/transactions/${order4.id}/debit-notes`, 'buyer');
    recordTest(
      'Phase 7',
      'Debit notes & net adjusted settlement query (/debit-notes)',
      debitNotesRes.status === 200 && debitNotesRes.data?.summary?.originalAmount === 150000
    );

    // ------------------------------------------------------------------
    // PHASE 8: ADMIN OPERATIONS, BATCH SETTLEMENT & KEY POOL
    // ------------------------------------------------------------------
    console.log(`\n--- PHASE 8: ADMIN OPERATIONS, BATCH SETTLEMENT & CRONS ---`);

    // 8.1 Admin Dashboard Metrics
    const metricsRes = await getJson('/api/dashboard/metrics', 'admin');
    const totalTx = metricsRes.data?.totalTransactions ?? metricsRes.data?.metrics?.totalTransactions;
    const settledVol = metricsRes.data?.settledFunds ?? metricsRes.data?.metrics?.settledFunds;
    recordTest(
      'Phase 8',
      'Enterprise dashboard aggregations (/api/dashboard/metrics)',
      metricsRes.status === 200 && typeof totalTx === 'number',
      `Total Tx: ${totalTx} | Settled: Rs. ${Number(settledVol).toLocaleString('en-IN')}`
    );

    // 8.2 Gemini Key Pool Status
    const keyPoolRes = await getJson('/api/admin/key-pool', 'admin');
    const availKeys = keyPoolRes.data?.pool?.availableKeys ?? keyPoolRes.data?.pool?.totalKeys;
    recordTest(
      'Phase 8',
      'Gemini key pool load-balancer health (/api/admin/key-pool)',
      keyPoolRes.status === 200 && availKeys >= 0,
      `Available keys: ${availKeys}`
    );

    // 8.3 Queued Settlement Batch
    const batchListRes = await getJson('/api/admin/settlement-batch', 'admin');
    recordTest(
      'Phase 8',
      'Admin settlement batch queue inspection (/api/admin/settlement-batch GET)',
      batchListRes.status === 200 && typeof batchListRes.data?.queuedCount === 'number',
      `Queued: ${batchListRes.data?.queuedCount} orders`
    );

    // 8.4 Clear Settlement Batch (Process Queued Orders)
    if (batchListRes.data?.queuedCount > 0) {
      const batchExecRes = await postJson('/api/admin/settlement-batch', {}, 'admin');
      recordTest(
        'Phase 8',
        'Process overnight settlement batch (/api/admin/settlement-batch POST)',
        batchExecRes.status === 200 && batchExecRes.data?.success === true,
        `Processed: ${batchExecRes.data?.settledCount} orders`
      );
    } else {
      recordTest(
        'Phase 8',
        'Settlement batch queue clear (no pending queued orders)',
        true,
        'Queue clean'
      );
    }

    // 8.5 Escrow SLA Timers Cron Watchdog
    const cronTimers = await getJson('/api/cron/escrow-timers', null, {
      Authorization: `Bearer ${CRON_SECRET}`,
    });
    recordTest(
      'Phase 8',
      'Escrow SLA timers cron trigger (/api/cron/escrow-timers)',
      cronTimers.status === 200 && cronTimers.data?.success === true
    );

    // 8.6 Merkle Anchor Batch Cron
    const cronMerkle = await getJson('/api/cron/merkle-anchor', null, {
      Authorization: `Bearer ${CRON_SECRET}`,
    });
    recordTest(
      'Phase 8',
      'Merkle tree batch anchor cron trigger (/api/cron/merkle-anchor)',
      [200, 201].includes(cronMerkle.status),
      `Status: ${cronMerkle.status}`
    );

    // 8.7 Corporate KYB Verification
    const kybRes = await postJson(`/api/users/${sessions.seller.user.id}/kyb`, {
      companyName: 'Apex Precision Engineering Ltd',
      taxId: `GSTIN29AAACA${RUN_ID}Z1`,
      registrationNumber: `REG-${RUN_ID}`,
      jurisdiction: 'IN',
      ubos: [
        {
          name: 'Vikramaditya Rao',
          equityPercentage: 65,
          nationality: 'IN',
          isPep: false,
        },
      ],
    }, 'admin');
    recordTest(
      'Phase 8',
      'Corporate KYB sanctions & UBO screening (/api/users/[id]/kyb)',
      kybRes.status === 200 && (kybRes.data?.success === true || kybRes.data?.kybStatus === 'CLEARED'),
      `Status: ${kybRes.data?.kybStatus}`
    );

    // ------------------------------------------------------------------
    // PHASE 9: ALL 10 FRONTEND UI APP ROUTER PAGES HEALTH CHECK
    // ------------------------------------------------------------------
    console.log(`\n--- PHASE 9: FRONTEND UI APP ROUTER PAGES HEALTH CHECK ---`);

    const uiRoutes = [
      { name: 'Landing Page', path: '/', role: null },
      { name: 'Counterparty Login', path: '/login', role: null },
      { name: 'Buyer Dashboard', path: '/buyer', role: 'buyer' },
      { name: 'Buyer Create PO Wizard', path: '/buyer/create', role: 'buyer' },
      { name: 'Buyer Order Detail Room', path: `/buyer/transaction/${order1.id}`, role: 'buyer' },
      { name: 'Seller Dashboard', path: '/seller', role: 'seller' },
      { name: 'Seller Order Evidence Room', path: `/seller/transaction/${order1.id}`, role: 'seller' },
      { name: 'Admin Cockpit', path: '/admin', role: 'admin' },
      { name: 'Admin Triage Room', path: `/admin/transaction/${order1.id}`, role: 'admin' },
      { name: 'Platform Settings', path: '/settings', role: 'admin' },
    ];

    for (const route of uiRoutes) {
      const res = await request(route.path, { method: 'GET' }, route.role);
      const text = await res.text();
      const isSuccess = res.status === 200 && !text.includes('Application error') && !text.includes('500: Internal Server Error');
      recordTest(
        'Phase 9',
        `UI Route [${route.path}] (${route.name})`,
        isSuccess,
        `Status: ${res.status} | Bytes: ${text.length}`
      );
    }

    // ------------------------------------------------------------------
    // TEST SUMMARY REPORT
    // ------------------------------------------------------------------
    console.log(`\n================================================================`);
    console.log(`FINAL VERIFICATION SUMMARY`);
    console.log(`================================================================`);
    const passedTests = testResults.filter((t) => t.passed);
    const failedTests = testResults.filter((t) => !t.passed);

    console.log(`Total Tests Run: ${testResults.length}`);
    console.log(`Passed:         ${passedTests.length}`);
    console.log(`Failed:         ${failedTests.length}`);
    console.log(`Success Rate:   ${((passedTests.length / testResults.length) * 100).toFixed(1)}%`);

    if (failedTests.length > 0) {
      console.log(`\nFailed Checks:`);
      for (const f of failedTests) {
        console.log(` - [${f.phase}] ${f.testName}: ${f.details}`);
      }
      process.exit(1);
    } else {
      console.log(`\nALL END-TO-END FUNCTIONS, UI PAGES, APIS & DB MAPPINGS VERIFIED SUCCESSFULLY ON VERCEL!`);
      process.exit(0);
    }
  } catch (fatalErr) {
    console.error('\nFatal test execution error:', fatalErr);
    process.exit(1);
  }
}

run();
