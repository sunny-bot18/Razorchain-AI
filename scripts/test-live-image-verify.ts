import fs from 'fs';

export {};

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('  Testing End-to-End AI Verification on Real .JPG Image File');
  console.log('================================================================\n');

  // 1. Login as Buyer & Seller
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
  const sellerData = await sellerRes.json();
  const sellerId = sellerData.user.id;

  // 2. Create Transaction matching the JPG delivery receipt
  const poNumber = 'PO-99882';
  const createTxRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
    body: JSON.stringify({
      sellerId,
      poNumber,
      productDescription: 'Precision Stainless Steel Valves',
      quantity: 500,
      amount: 150000,
      deliveryAddress: 'Plot 42, Electronic City Phase 1, Bengaluru 560100',
      expectedDeliveryDate: '2026-09-02T18:30:00.000Z',
    }),
  });
  const txData = await createTxRes.json();
  const txId = txData.transaction.id;
  console.log(`1. Created Purchase Order Transaction: ${txId} (${poNumber})`);

  // 3. Lock escrow funds
  await fetch(`${BASE_URL}/api/transactions/${txId}/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
  });
  console.log('2. Escrow Funds Locked (FUNDS_RESERVED)');

  // 4. Upload sample-docs/delivery-receipt.jpg
  const jpgBytes = fs.readFileSync('sample-docs/delivery-receipt.jpg');
  const formData = new FormData();
  formData.append(
    'files',
    new Blob([jpgBytes], { type: 'image/jpeg' }),
    'delivery-receipt.jpg'
  );

  const uploadRes = await fetch(`${BASE_URL}/api/transactions/${txId}/documents`, {
    method: 'POST',
    headers: { Cookie: sellerCookie },
    body: formData,
  });
  const uploadData = await uploadRes.json();
  console.log(`3. Uploaded .JPG image: delivery-receipt.jpg (SHA-256: ${uploadData.documents[0].sha256.slice(0, 16)}...)`);

  // 5. Trigger AI Verification
  console.log('4. Calling POST /api/transactions/:id/verify to run Google Gemini Multimodal Vision...');
  const t0 = Date.now();
  const verifyRes = await fetch(`${BASE_URL}/api/transactions/${txId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
  });
  const verifyDuration = Date.now() - t0;
  const verifyData = await verifyRes.json();

  console.log('\n================================================================');
  console.log('  LIVE GOOGLE GEMINI AI VERIFICATION RESULTS');
  console.log('================================================================');
  console.log(`HTTP Status:        ${verifyRes.status}`);
  console.log(`Execution Duration: ${verifyDuration} ms`);
  console.log(`Execution Mode:     ${verifyData.vision?.execution_mode}`);
  console.log(`AI Model Used:      ${verifyData.vision?.model_used}`);
  console.log(`API Key Masked:     ${verifyData.vision?.key_used}`);
  console.log(`Overall Confidence: ${((verifyData.vision?.overall_confidence || 0) * 100).toFixed(0)}%`);
  console.log(`Settlement Decision: ${verifyData.verification?.status}`);
  console.log('----------------------------------------------------------------');
  console.log('Exact Fields Read from .JPG Pixels by Gemini:');
  console.log(JSON.stringify(verifyData.vision?.documents?.[0]?.fields, null, 2));
  console.log('----------------------------------------------------------------');
  console.log('Signature & Stamp Detected by Gemini:');
  console.log(`  Signature Detected: ${verifyData.vision?.documents?.[0]?.signature_detected}`);
  console.log(`  Raw Text Excerpt:   "${verifyData.vision?.documents?.[0]?.raw_text_excerpt}"`);
  console.log('----------------------------------------------------------------');
  console.log('8-Point Verification Engine Checks:');
  for (const check of verifyData.verification?.checks || []) {
    const icon = check.status === 'PASS' ? '✓' : '✗';
    console.log(`  ${icon} [${check.status}] ${check.label}: expected="${check.expected}" actual="${check.actual}"`);
  }
  console.log('================================================================\n');
}

run().catch(console.error);
