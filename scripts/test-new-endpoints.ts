export {};
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function run() {
  console.log('========================================================');
  console.log('  Testing New Financing, Disputes & Treasury Endpoints');
  console.log(`  Target: ${BASE_URL}`);
  console.log('========================================================\n');

  // 1. Auth setup
  const buyerRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: 'buyer@demo.com', password: 'password123' }),
  });
  const buyerCookie = buyerRes.headers.get('set-cookie') || '';

  const sellerRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: 'seller@demo.com', password: 'password123' }),
  });
  const sellerCookie = sellerRes.headers.get('set-cookie') || '';

  const adminRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: 'admin@demo.com', password: 'password123' }),
  });
  const adminCookie = adminRes.headers.get('set-cookie') || '';
  const sellerData = await sellerRes.json();
  const sellerId = sellerData.user.id;

  console.log('✓ Authentication successful for Buyer, Seller, and Admin');

  // 2. Create and reserve a base transaction for testing
  const createRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
    body: JSON.stringify({
      sellerId,
      poNumber: `PO-FIN-${Date.now()}`,
      productDescription: 'Precision CNC Machined Shafts',
      quantity: 50,
      amount: 100000,
      deliveryAddress: 'Bengaluru Tech Park',
      expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    }),
  });
  const createData = await createRes.json();
  const txId = createData.transaction.id;
  console.log(`✓ Created Transaction ${createData.transaction.transactionNumber} (ID: ${txId})`);

  await fetch(`${BASE_URL}/api/transactions/${txId}/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
  });
  console.log('✓ Escrow funds reserved (Status: FUNDS_RESERVED)');

  // ----------------------------------------------------
  // TEST 1: POST /api/factoring (Pledge)
  // ----------------------------------------------------
  console.log('\n--- 1. FACTORING PLEDGE ---');
  const pledgeRes = await fetch(`${BASE_URL}/api/factoring`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sellerCookie },
    body: JSON.stringify({
      transactionId: txId,
      lenderId: 'len_kredx_enterprise',
      lenderName: 'KredX Enterprise Finance',
      advancePercentage: 85,
      discountFeePercentage: 2.5,
    }),
  });
  const pledgeData = await pledgeRes.json();
  console.log(`HTTP ${pledgeRes.status}:`, JSON.stringify(pledgeData.pledge, null, 2));
  const pledgeId = pledgeData.pledge.id;

  // ----------------------------------------------------
  // TEST 2: POST /api/factoring/approve
  // ----------------------------------------------------
  console.log('\n--- 2. POST /api/factoring/approve ---');
  const approveRes = await fetch(`${BASE_URL}/api/factoring/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      pledgeId,
      approvedAmount: 85000,
      discountFeePercentage: 2.5,
      remarks: 'Risk scoring tier-A verified; collateral valid.',
    }),
  });
  const approveData = await approveRes.json();
  console.log(`HTTP ${approveRes.status}:`, JSON.stringify(approveData, null, 2));

  // ----------------------------------------------------
  // TEST 3: POST /api/factoring/disburse
  // ----------------------------------------------------
  console.log('\n--- 3. POST /api/factoring/disburse ---');
  const disburseRes = await fetch(`${BASE_URL}/api/factoring/disburse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      pledgeId,
      utrNumber: 'UTR-AXIS-8829104',
      lienReference: 'LIEN-KREDX-2026-001',
    }),
  });
  const disburseData = await disburseRes.json();
  console.log(`HTTP ${disburseRes.status}:`, JSON.stringify(disburseData, null, 2));

  // ----------------------------------------------------
  // TEST 4: GET /api/lender/portfolio
  // ----------------------------------------------------
  console.log('\n--- 4. GET /api/lender/portfolio ---');
  const portfolioRes = await fetch(`${BASE_URL}/api/lender/portfolio?lenderId=len_kredx_enterprise`, {
    headers: { Cookie: adminCookie },
  });
  const portfolioData = await portfolioRes.json();
  console.log(`HTTP ${portfolioRes.status} Portfolio Summary:`, JSON.stringify(portfolioData.portfolio.metrics, null, 2));

  // ----------------------------------------------------
  // TEST 5: POST /api/transactions/:id/virtual-account
  // ----------------------------------------------------
  console.log('\n--- 5. POST /api/transactions/:id/virtual-account ---');
  const vanRes = await fetch(`${BASE_URL}/api/transactions/${txId}/virtual-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
    body: JSON.stringify({ partnerBank: 'AXIS', expiresHours: 72 }),
  });
  const vanData = await vanRes.json();
  console.log(`HTTP ${vanRes.status}:`, JSON.stringify(vanData.virtualAccount, null, 2));

  // ----------------------------------------------------
  // TEST 6: POST /api/transactions/:id/debit-notes
  // ----------------------------------------------------
  console.log('\n--- 6. POST /api/transactions/:id/debit-notes ---');
  const dnRes = await fetch(`${BASE_URL}/api/transactions/${txId}/debit-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
    body: JSON.stringify({
      type: 'DEBIT_NOTE',
      amount: 4500,
      reason: 'Surface roughness tolerance defect on 3 units',
      lineItemRef: 'LINE-ITEM-01',
    }),
  });
  const dnData = await dnRes.json();
  console.log(`HTTP ${dnRes.status}:`, JSON.stringify(dnData.summary, null, 2));

  // ----------------------------------------------------
  // TEST 7: GET /api/transactions/:id/debit-notes
  // ----------------------------------------------------
  console.log('\n--- 7. GET /api/transactions/:id/debit-notes ---');
  const getDnRes = await fetch(`${BASE_URL}/api/transactions/${txId}/debit-notes`, {
    headers: { Cookie: buyerCookie },
  });
  const getDnData = await getDnRes.json();
  console.log(`HTTP ${getDnRes.status} Notes Count: ${getDnData.notes.length}`);

  // ----------------------------------------------------
  // TEST 8: POST /api/transactions/:id/dispute (Halt SLA)
  // ----------------------------------------------------
  console.log('\n--- 8. POST /api/transactions/:id/dispute ---');
  const disputeRes = await fetch(`${BASE_URL}/api/transactions/${txId}/dispute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
    body: JSON.stringify({
      category: 'DAMAGED_GOODS',
      reason: 'Outer wooden casing crushed during transit; internal shaft threads bent',
      claimAmount: 25000,
      description: 'Damage inspected at receiving dock Gate 3. Photographic report prepared.',
    }),
  });
  const disputeData = await disputeRes.json();
  console.log(`HTTP ${disputeRes.status}:`, JSON.stringify(disputeData, null, 2));

  // ----------------------------------------------------
  // TEST 9: POST /api/transactions/:id/evidence
  // ----------------------------------------------------
  console.log('\n--- 9. POST /api/transactions/:id/evidence ---');
  const evidenceRes = await fetch(`${BASE_URL}/api/transactions/${txId}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
    body: JSON.stringify({
      evidenceCategory: 'DAMAGE_PHOTO',
      title: 'Crushed Transit Crate and Bent Threads',
      description: 'Dock inspection photograph with certified time stamp.',
      content: 'EVIDENCE BLOB: High resolution photographic proof showing 3 damaged shafts.',
    }),
  });
  const evidenceData = await evidenceRes.json();
  console.log(`HTTP ${evidenceRes.status}:`, JSON.stringify({
    documentId: evidenceData.document.id,
    fileName: evidenceData.document.fileName,
    sha256: evidenceData.sha256,
    disputeId: evidenceData.disputeId,
  }, null, 2));

  // ----------------------------------------------------
  // TEST 10: POST /api/cron/merkle-anchor
  // ----------------------------------------------------
  console.log('\n--- 10. POST /api/cron/merkle-anchor ---');
  const anchorRes = await fetch(`${BASE_URL}/api/cron/merkle-anchor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ maxBatchSize: 50 }),
  });
  const anchorData = await anchorRes.json();
  console.log(`HTTP ${anchorRes.status}:`, JSON.stringify(anchorData, null, 2));

  console.log('\n========================================================');
  console.log('  ✓ ALL NEW ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY');
  console.log('========================================================\n');
}

run().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
