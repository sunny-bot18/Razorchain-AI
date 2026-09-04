import fs from 'fs';
import sharp from 'sharp';

export {};

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('  Testing Aegis Forensic Interception & State Machine Defense');
  console.log('================================================================\n');

  // 1. Authenticate Buyer & Seller
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

  // 2. Create Purchase Order Transaction
  const poNumber = `PO-FRAUD-${Date.now().toString().slice(-5)}`;
  const createTxRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
    body: JSON.stringify({
      sellerId: sellerData.user.id,
      poNumber,
      productDescription: 'High-Precision CNC Turbines',
      quantity: 100,
      amount: 450000,
      deliveryAddress: 'Turbine Depot 9, Peenya Industrial Area, Bengaluru',
      expectedDeliveryDate: '2026-09-10T12:00:00.000Z',
    }),
  });
  const txData = await createTxRes.json();
  const txId = txData.transaction.id;
  console.log(`1. Created Purchase Order: ${txId} (${poNumber})`);

  // 3. Lock escrow funds
  await fetch(`${BASE_URL}/api/transactions/${txId}/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
  });
  console.log('2. Escrow Funds Locked (FUNDS_RESERVED)');

  // 4. Generate a realistic delivery receipt SVG with inpainting anomaly on signature/quantity
  const uniqueId = Date.now();
  const svgReceipt = `
  <svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="40" y="60" font-family="monospace" font-size="22" font-weight="bold" fill="#111827">LOGISTICS DELIVERY RECEIPT</text>
    <line x1="40" y1="80" x2="560" y2="80" stroke="#d1d5db" stroke-width="2"/>
    <text x="40" y="120" font-family="monospace" font-size="16" fill="#374151">PO: ${poNumber}</text>
    <text x="40" y="160" font-family="monospace" font-size="16" fill="#374151">REF: LR-${uniqueId}</text>
    <text x="40" y="200" font-family="monospace" font-size="16" fill="#374151">ORIGINAL QUANTITY: 100</text>
    <text x="40" y="240" font-family="monospace" font-size="16" fill="#374151">DATE: 2026-09-02</text>
    
    <!-- Tampered / Inpainted overlay zone: high contrast altered pixels simulating forged signature & quantity -->
    <rect x="35" y="300" width="300" height="150" fill="#f8fafc" stroke="#dc2626" stroke-width="1"/>
    <text x="50" y="340" font-family="monospace" font-size="18" font-weight="bold" fill="#dc2626">FORGED QUANTITY: 9999</text>
    <text x="50" y="390" font-family="cursive" font-size="30" fill="#000000">Altered Signature</text>
  </svg>`;

  const tamperedJpg = await sharp(Buffer.from(svgReceipt))
    .jpeg({ quality: 90 })
    .toBuffer();

  fs.writeFileSync('sample-docs/tampered-receipt.jpg', tamperedJpg);
  console.log('3. Generated synthetic/tampered delivery receipt with inpainting anomalies');

  // 5. Upload tampered image as seller
  console.log('4. Seller attempts to upload tampered receipt via POST /api/transactions/:id/documents...');
  const formData = new FormData();
  formData.append('files', new Blob([tamperedJpg], { type: 'image/jpeg' }), 'tampered-receipt.jpg');

  const uploadRes = await fetch(`${BASE_URL}/api/transactions/${txId}/documents`, {
    method: 'POST',
    headers: { Cookie: sellerCookie },
    body: formData,
  });
  const uploadData = await uploadRes.json();
  console.log(`   Upload HTTP Response: ${uploadRes.status}`);

  // 6. Verify Transaction State Machine Interception
  const txCheckRes = await fetch(`${BASE_URL}/api/transactions/${txId}`, {
    headers: { Cookie: buyerCookie },
  });
  const updatedTx = await txCheckRes.json();

  console.log('\n================================================================');
  console.log('  AEGIS FORENSIC INTERCEPTION & STATE MACHINE VERIFICATION');
  console.log('================================================================');
  console.log(`Document Saved to DB: ${uploadData.documents?.[0]?.id ? 'YES (Evidence Preserved)' : 'NO'}`);
  console.log(`Document SHA-256:      ${uploadData.documents?.[0]?.sha256}`);
  console.log(`Forensic Flags:        ${JSON.stringify(uploadData.documents?.[0]?.forensicMetadata?.flags)}`);
  console.log(`Transaction Status:    ${updatedTx.transaction?.status} (Expected: MANUAL_REVIEW)`);
  console.log(`Escrow SLA Timers:     ${updatedTx.transaction?.autoReleaseAt === null ? 'FROZEN (autoReleaseAt = null)' : 'ACTIVE'}`);

  // 7. Verify Audit Log Anchoring
  const auditRes = await fetch(`${BASE_URL}/api/transactions/${txId}/audit`, {
    headers: { Cookie: buyerCookie },
  });
  const auditData = await auditRes.json();
  const fraudLog = auditData.auditLogs?.find((l: any) => l.event === 'FORENSIC_FRAUD_INTERCEPTED');

  console.log('----------------------------------------------------------------');
  console.log('Immutable Audit Trail Check:');
  console.log(`  Actor:     ${fraudLog?.actor}`);
  console.log(`  Event:     ${fraudLog?.event}`);
  console.log(`  Result:    ${fraudLog?.result}`);
  console.log(`  Tamper Proof Anchored: ${fraudLog ? 'YES (Cryptographically Recorded)' : 'NO'}`);
  console.log('================================================================\n');

  if (updatedTx.transaction?.status === 'MANUAL_REVIEW' && updatedTx.transaction?.autoReleaseAt === null && fraudLog) {
    console.log('✓ SUCCESS: All 3 tiers of forensic interception, timer freezing, and audit anchoring verified!');
  } else {
    console.error('✗ FAILURE: Interception requirements not met.');
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
