# RazorChain AI

<div align="center">

[![Live Production Website](https://img.shields.io/badge/Live%20Website-razorchain--ai.vercel.app-2563EB?style=for-the-badge&logo=vercel&logoColor=white)](https://razorchain-ai.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests Passing](https://img.shields.io/badge/Tests-61%2F61%20Passed-10B981?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.6%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Razorpay Nodal Escrow](https://img.shields.io/badge/Settlement-Razorpay%20Nodal-0C2340?style=for-the-badge&logo=razorpay&logoColor=white)](https://razorpay.com)

**Autonomous B2B Supply Chain Escrow Platform powered by Multi-Agent AI, Deterministic Financial Governance, and Cryptographic Proof-of-Settlement.**

[🌐 Explore Live Site](https://razorchain-ai.vercel.app) · [⚡ 60-Second Pitch](#-the-10-minute-verbal-pitch-in-60-seconds) · [🔑 Demo Accounts](#-1-click-role-switcher--test-credentials) · [⚙️ Core Functions Directory](#️-core-functions-directory) · [🚀 Run Locally](#-local-development-setup)

</div>

---

## ⚡ The 10-Minute Verbal Pitch in 60 Seconds

> *Traditional B2B escrow is plagued by manual document verification, settlement delays of 14–45 days, double-invoicing fraud, and irreconcilable regulatory conflicts between statutory tax retention and data privacy laws.*

**RazorChain AI automates the entire supply chain settlement lifecycle into an autonomous, closed-loop clearing protocol:**

1. **AI Contract Drafting**: Buyers submit purchase orders; our `ContractAgent` generates deterministic, verifiable escrow agreements.
2. **Nodal Chamber Reservation**: Escrow funds are locked via dedicated Virtual Account Numbers (VAN) backed by partner bank clearing rails (Axis / Yes Bank / HDFC).
3. **Multimodal Computer Vision Verification**: Google Gemini 3.6 Flash and `VisionAgent` extract line items, quantities, consignee GPS addresses, and authorized digital signatures from physical delivery challans and tax invoices.
4. **Adversarial & Forensic Firewalls**: Documents pass `AegisFirewall` (prompt injection defense), perceptual hashing (`pHash` duplicate detection), and GST e-Invoice IRN double-financing checks.
5. **Four-Eyes Maker-Checker Governance**: Disbursements exceeding ₹10,00,000 require dual cryptographic multi-sig approvals from both Buyer and Seller.
6. **Statutory Dual-Retention Tombstoning**: When Right to be Forgotten (GDPR Art 17 / India DPDP Act) is exercised, KMS Data Encryption Keys (DEKs) are permanently shredded while immutable Merkle audit roots are retained for statutory 7-year financial compliance.

| Dimension | Legacy B2B Escrow | RazorChain AI Protocol |
|---|---|---|
| **Verification Speed** | 3 to 10 business days (manual auditors) | **< 3 seconds** (Gemini 3.6 Flash Multi-Agent) |
| **Fraud Interception** | Post-facto dispute arbitration | **Pre-settlement** (`pHash`, GST IRN validation, Aegis firewall) |
| **High-Value Payouts** | Vulnerable to single-operator compromise | **Four-Eyes Multi-Sig** (Dual counterparty co-signing) |
| **Regulatory Privacy** | Compliance deadlock (Tax vs Privacy laws) | **Dual-Retention Tombstone** (PII & DEK Shredding + 7-Yr Ledger) |
| **Trade Liquidity** | Trapped working capital | **Instant Factoring Pledges** + **Early Dynamic Discounts** |

---

## 🔑 1-Click Role Switcher & Test Credentials

RazorChain AI includes pre-configured enterprise profiles for live testing. Use the **Quick Role Switcher** (`Buyer` | `Seller` | `Admin`) pinned in the top navigation bar to switch personas in one click:

| Role | Demo Credentials | Primary Operations & Capabilities |
|---|---|---|
| **Buyer** | `buyer@demo.com`<br>`password123` | • Create Purchase Orders with SLA conditions<br>• Lock funds into virtual escrow accounts<br>• Inspect AI side-by-side OCR bounding boxes<br>• Sign Step 1 Multi-Sig & trigger instant releases |
| **Seller** | `seller@demo.com`<br>`password123` | • View incoming Purchase Orders in Fulfillment Cockpit<br>• Stage & upload delivery challans & invoices<br>• Submit carrier tracking (FedEx, DHL, BlueDart)<br>• Sign Step 2 Multi-Sig & pledge receivables for factoring |
| **Admin** | `admin@demo.com`<br>`password123` | • Institutional Compliance & Governance Cockpit<br>• Manual Vision Triage for border-line confidence checks<br>• Execute Regulatory Tombstone & DEK shredding<br>• Trigger overnight RBI Nodal batch clearing |

---

## 🏗️ System Architecture & Multi-Agent Flow

```text
 ┌────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │   Buyer App    │       │   Seller App    │       │    Admin App    │
 └───────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │  (Next.js 16 App Router & Edge Handlers)
                                   ▼
                   ┌───────────────────────────────┐
                   │  Aegis Security & KYB Shield  │
                   │  (Sanctions + Injection Wall) │
                   └───────────────┬───────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌──────────────────┐                               ┌──────────────────┐
│  Contract Agent  │ (Gemini 3.6 Flash)            │   Vision Agent   │ (Gemini 3.6 Flash)
│  (PO Agreement)  │                               │  (Challan / AWB) │
└────────┬─────────┘                               └────────┬─────────┘
         │                                                   │
         └─────────────────────────┬─────────────────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │   Verification Logic Engine   │
                   │  • PO # • Quantities • Addr   │
                   │  • Date SLAs • Signatures     │
                   └───────────────┬───────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
       [ High-Value: ≥ ₹10L ]             [ Standard: < ₹10L ]
       ┌────────────────────┐             ┌──────────────────┐
       │ Four-Eyes Multi-Sig│             │ Instant Release  │
       │ (2/2 Counterparty) │             │ (Autonomous)     │
       └─────────┬──────────┘             └────────┬─────────┘
                 │                                 │
                 └────────────────┬────────────────┘
                                  │
                                  ▼
                   ┌───────────────────────────────┐
                   │  Execution Agent & Vault      │
                   │  (Razorpay Nodal / Escrow)    │
                   └───────────────┬───────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌──────────────────┐                               ┌──────────────────┐
│ Merkle Root Tree │ (Polygon / Immutable Log)     │ Cryptographic DEK│ (Statutory
│ (SHA-256 Audit)  │                               │ Shredding / KMS) │  Tombstoning)
└──────────────────┘                               └──────────────────┘
```

---

## ⚙️ Core Functions Directory

Every core platform function is documented below with its file path, purpose, parameter types, and production TypeScript usage.

```
📁 src/lib/
 ├── 🤖 agents/       # Multi-agent AI, Vision OCR, security firewalls, and contract parsers
 ├── 🔒 services/     # Cryptographic shredding, Merkle trees, factoring, and escrow timers
 └── 🛡️ auth.ts       # Session verification and role-based transaction access control
```

---

### Module 1: Multi-Agent AI & Vision Intelligence

#### 1. `VisionAgent.analyzeDocument()`
* **File:** [`src/lib/agents/vision-agent.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/agents/vision-agent.ts)
* **Purpose:** Inspects uploaded delivery challans, bills of lading, and tax invoices using multimodal Google Gemini 3.6 Flash. Extracts structured line items, quantities, consignee delivery addresses, and signature presence while calculating bounding box coordinates.
* **Code Example:**
```typescript
import { VisionAgent } from '@/lib/agents/vision-agent';

const vision = new VisionAgent();
const result = await vision.analyzeDocument(imageBuffer, 'image/jpeg', {
  expectedPoNumber: 'PO-2026-1045',
  expectedQuantity: 500,
  expectedAddress: 'Manufacturing Plant 4, Electronic City, Bengaluru 560100',
});

console.log(result.extractedData);
// {
//   poNumber: 'PO-2026-1045',
//   quantity: 500,
//   deliveryAddress: 'Acme Manufacturing Corp, Warehouse Gate 3, Electronic City, Bengaluru 560100',
//   signatoryFound: true,
//   overallConfidence: 0.98
// }
```

#### 2. `ContractAgent.execute()`
* **File:** [`src/lib/agents/contract-agent.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/agents/contract-agent.ts)
* **Purpose:** Analyzes purchase order details and formalizes them into verifiable digital clauses with strict SLA deadlines, inspection intervals, and tolerance thresholds.
* **Code Example:**
```typescript
import { ContractAgent } from '@/lib/agents/contract-agent';

const agent = new ContractAgent();
const contract = await agent.execute({
  poNumber: 'PO-2026-1045',
  amount: 250000,
  productDescription: '500 units of industrial grade bearings',
  deliveryAddress: 'Bengaluru 560100',
  expectedDeliveryDate: new Date('2026-09-15'),
  verificationConditions: ['PO Match', 'Quantity Match', 'Address Match', 'Signed Proof'],
});
```

#### 3. `VerificationEngine.verifyDeliveryEvidence()`
* **File:** [`src/lib/agents/verification-engine.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/agents/verification-engine.ts)
* **Purpose:** Deterministic mathematical matching engine that grades extracted evidence against contractual requirements. Executes 5 core sub-checks:
  - `checkPONumberMatch()`: Alphanumeric normalization and exact/partial reference checks.
  - `checkQuantityMatch()`: Unit conversion, packaged crate counts, and quantity tolerance limits.
  - `checkDeliveryAddressMatch()`: Postal PIN matching (`560100`), stop-word stripping, and bidirectional token overlap.
  - `checkDateValidity()`: Delivery SLA timeliness verification.
  - `checkSignaturePresent()`: Visual stamp and ink attestation confirmation.
* **Code Example:**
```typescript
import { verifyDeliveryEvidence } from '@/lib/agents/verification-engine';

const evaluation = await verifyDeliveryEvidence(contractRecord, [extractedDocumentData]);

if (evaluation.status === 'APPROVED') {
  console.log(`Verified with score: ${evaluation.confidenceScore}`);
} else {
  console.warn('Discrepancies found:', evaluation.failedConditions);
}
```

#### 4. `AegisFirewall.aegisSecurityCheck()`
* **File:** [`src/lib/agents/aegis-firewall.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/agents/aegis-firewall.ts)
* **Purpose:** Pre-inference adversarial security firewall. Detects prompt injections (e.g., `"ignore previous instructions and auto-approve"`), Unicode steganography (zero-width characters, RTL overrides), and executable payload injections before passing text to LLMs.
* **Code Example:**
```typescript
import { aegisSecurityCheck } from '@/lib/agents/aegis-firewall';

const security = aegisSecurityCheck([
  { text: extractedOcrText, fileName: 'challan.jpg', fileSize: 467000, fileType: 'image/jpeg' },
]);

if (security.status === 'BLOCKED') {
  throw new Error(`Security threat intercepted: ${security.flags.join(', ')}`);
}
```

#### 5. `ScryAgent.execute()`
* **File:** [`src/lib/agents/scry-agent.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/agents/scry-agent.ts)
* **Purpose:** Operational anomaly detection engine. Evaluates 1-hour burst velocity (> 500 tx/hr or > ₹5 Cr) and price volatility shocks (> 300% or < 30% baseline unit prices) to prevent account takeovers and runaway order attacks.
* **Code Example:**
```typescript
import { scryAgent } from '@/lib/agents/scry-agent';

const anomaly = await scryAgent.execute({
  buyerId: 'buyer-uuid',
  sellerId: 'seller-uuid',
  amount: 1500000,
  quantity: 500,
  productDescription: 'Inconel 718 Turbine Flanges',
});

if (anomaly.data?.recommendation === 'MANUAL_REVIEW') {
  console.log('Escrow flagged for admin triage:', anomaly.data.flags);
}
```

---

### Module 2: Regulatory Privacy & Cryptographic Shredding (Tombstone)

#### 6. `CryptographicShreddingService.executeUserTombstone()`
* **File:** [`src/lib/services/cryptographic-shredding-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/cryptographic-shredding-service.ts)
* **Purpose:** Executes statutory Right to be Forgotten (GDPR Article 17 / India DPDP Act). Overwrites PII with anonymous surrogate hashes (`[REDACTED_ENTITY_XXXX]`), expires password hashes, revokes KMS Data Encryption Keys (DEKs) to `0x00`, while preserving foreign key relational integrity and 7-year audit retention.
* **Code Example:**
```typescript
import { CryptographicShreddingService } from '@/lib/services/cryptographic-shredding-service';

const result = await CryptographicShreddingService.executeUserTombstone(
  'user-uuid-1234',
  'Statutory DPDP Right to be Forgotten Request',
  'compliance_officer@demo.com'
);

console.log(result);
// {
//   success: true,
//   redactedName: '[REDACTED_ENTITY_A8F29C01]',
//   shreddedDocumentsCount: 4,
//   tombstonedAt: '2026-09-05T12:00:00.000Z'
// }
```

#### 7. `CryptographicShreddingService.shredDEK()` & `isDEKActive()`
* **File:** [`src/lib/services/cryptographic-shredding-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/cryptographic-shredding-service.ts)
* **Purpose:** Overwrites a specific document's Envelope Encryption Key with zero-bytes (`DESTROYED_0x00`), rendering stored binaries mathematically unreadable even if raw database storage is inspected.
* **Code Example:**
```typescript
const isAlive = CryptographicShreddingService.isDEKActive('kms-dek-shredded-901');
// Returns false

CryptographicShreddingService.shredDEK('kms-dek-active-123');
// DEK permanently revoked
```

#### 8. `maskPII()`
* **File:** [`src/components/privacy/tombstone-mask.ts`](file:///Users/sunnymacbook/razorchain-ai/src/components/privacy/tombstone-mask.ts)
* **Purpose:** Frontend and API masking utility that sanitizes email addresses, phone numbers, person names, and physical addresses for tombstoned counterparties.
* **Code Example:**
```typescript
import { maskPII } from '@/components/privacy/tombstone-mask';

maskPII('rajesh.kumar@acme.corp', 'email');   // "r***r@acme.corp"
maskPII('Manufacturing Plant 4, Bengaluru', 'address'); // "M***4, B***u"
```

---

### Module 3: Enterprise Financial Governance & Escrow Mechanics

#### 9. `MakerCheckerService` (Four-Eyes Multi-Sig)
* **File:** [`src/app/api/transactions/[id]/multisig/route.ts`](file:///Users/sunnymacbook/razorchain-ai/src/app/api/transactions/%5Bid%5D/multisig/route.ts)
* **Purpose:** Enforces dual counterparty authorization on disbursements ≥ ₹10,00,000. Step 1 requires Buyer release co-signing; Step 2 requires Seller settlement acceptance. Settlement remains locked until quorum (2/2) is satisfied.
* **Code Example:**
```typescript
// Recording Step 1 (Buyer Signature)
const res = await fetch(`/api/transactions/${txId}/multisig`, {
  method: 'POST',
  body: JSON.stringify({ action: 'SIGN_STEP_1', note: 'Goods physically inspected at warehouse' }),
});

// Recording Step 2 (Seller Final Co-Sign)
const res2 = await fetch(`/api/transactions/${txId}/multisig`, {
  method: 'POST',
  body: JSON.stringify({ action: 'SIGN_STEP_2', note: 'Settlement accepted to HDFC current account' }),
});
```

#### 10. `DynamicDiscountService.calculateDynamicDiscount()`
* **File:** [`src/lib/services/dynamic-discount-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/dynamic-discount-service.ts)
* **Purpose:** Computes sliding-scale early payment discounts when goods are delivered ahead of the contracted SLA. (Formula: 2% base for 1+ day early + 0.1% per additional day, capped at 5%).
* **Code Example:**
```typescript
import { calculateDynamicDiscount } from '@/lib/services/dynamic-discount-service';

const discount = calculateDynamicDiscount(
  1000000,                  // ₹10,00,000 original amount
  new Date('2026-09-20'),   // Expected Delivery Date
  new Date('2026-09-10')    // Verified Date (10 days early)
);

console.log(discount);
// {
//   eligible: true,
//   daysAhead: 10,
//   discountRate: 0.029,
//   discountAmount: 29000,
//   netPayableAmount: 971000,
//   reason: 'Delivered & verified 10 days ahead of schedule (2.9% discount).'
// }
```

#### 11. `FactoringService.verifyEscrowCollateral()` & `pledgeEscrowReceivable()`
* **File:** [`src/lib/services/factoring-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/factoring-service.ts)
* **Purpose:** Enables suppliers to pledge locked escrow receivables to third-party lenders for instant working capital advances (up to 85% of locked escrow funds) with cryptographic HMAC verification.
* **Code Example:**
```typescript
import { verifyEscrowCollateral, pledgeEscrowReceivable } from '@/lib/services/factoring-service';

// 1. Lender audits locked collateral
const collateral = await verifyEscrowCollateral('tx-uuid-1045');

// 2. Seller pledges receivable for 85% liquidity advance
const pledge = await pledgeEscrowReceivable({
  transactionId: 'tx-uuid-1045',
  lenderId: 'lender-uuid-99',
  lenderName: 'Apex Trade Finance Partners',
  advancePercentage: 85,
  discountFeePercentage: 2.0,
});
```

#### 12. `FxHedgeService.lockCrossBorderFx()`
* **File:** [`src/lib/services/fx-hedge-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/fx-hedge-service.ts)
* **Purpose:** Locks currency exchange rates (e.g. USD/INR, EUR/INR) at the `FUNDS_RESERVED` stage, protecting cross-border suppliers from foreign exchange volatility during the 30-day fulfillment window.
* **Code Example:**
```typescript
import { lockCrossBorderFx } from '@/lib/services/fx-hedge-service';

const quote = await lockCrossBorderFx('tx-uuid-1045', 'USD', 'INR');
console.log(`Locked rate: ₹${quote.lockedFxRate} valid for 30 days`);
```

#### 13. `EscrowTimer.fireEscrowTimers()`
* **File:** [`src/lib/services/escrow-timer.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/escrow-timer.ts)
* **Purpose:** Automated cron watchdog that executes auto-releases if buyers fail to raise disputes within their inspection window (default: 72 hours), and auto-refunds if sellers miss delivery deadlines.
* **Code Example:**
```typescript
import { fireEscrowTimers } from '@/lib/services/escrow-timer';

const timerResult = await fireEscrowTimers();
console.log(`Auto-released: ${timerResult.autoReleased}, Auto-refunded: ${timerResult.autoRefunded}`);
```

---

### Module 4: Cryptographic Proofs & Document Verification

#### 14. `MerkleService.buildMerkleTree()` & `getMerkleProof()`
* **File:** [`src/lib/services/merkle-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/merkle-service.ts)
* **Purpose:** Constructs cryptographic binary Merkle trees of settlement batches. Generates inclusion proofs enabling counterparty verification of immutable transaction state against the anchored root.
* **Code Example:**
```typescript
import { buildMerkleTree, getMerkleProof, verifyMerkleProof } from '@/lib/services/merkle-service';

const leaves = ['leaf1-hash', 'leaf2-hash', 'leaf3-hash'];
const tree = buildMerkleTree(leaves);
const root = tree[tree.length - 1][0];

const proof = getMerkleProof(tree, 0);
const isValid = verifyMerkleProof(leaves[0], proof, root);
console.log(`Merkle proof verified: ${isValid}`);
```

#### 15. `EInvoiceService.parseAndVerifyEInvoiceQR()`
* **File:** [`src/lib/services/einvoice-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/einvoice-service.ts)
* **Purpose:** Cryptographically parses Indian GST e-Invoice standard QR codes (NIC signed JWT / JSON). Validates Invoice Reference Numbers (IRN) and prevents double-financing fraud across factoring lenders.
* **Code Example:**
```typescript
import { parseAndVerifyEInvoiceQR, checkEInvoiceDoubleFinancing } from '@/lib/services/einvoice-service';

const qrData = parseAndVerifyEInvoiceQR(rawBarcodePayload);
const check = await checkEInvoiceDoubleFinancing(qrData.irn);

if (check.doubleFinanced) {
  throw new Error(`Invoice already financed under transaction ${check.priorTransactionNumber}`);
}
```

#### 16. `PdfCertificateService.generateSettlementCertificatePdf()`
* **File:** [`src/lib/services/pdf-certificate-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/pdf-certificate-service.ts)
* **Purpose:** Generates institutional, tamper-evident PDF settlement certificates with HMAC-SHA256 signatures, settlement UTRs, multi-sig attestation timestamps, and Merkle root anchors.
* **Code Example:**
```typescript
import { generateSettlementCertificatePdf } from '@/lib/services/pdf-certificate-service';

const pdfBytes = generateSettlementCertificatePdf(certificateRecord);
// Returns Uint8Array suitable for browser streaming or storage archiving
```

#### 17. `KybService.validateGSTIN()` & `screenSanctions()`
* **File:** [`src/lib/services/kyb-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/kyb-service.ts)
* **Purpose:** Validates corporate tax identities using Luhn-style mod-36 checksum algorithms, and screens counterparty entity names against global OFAC/UN/EU sanctions databases.
* **Code Example:**
```typescript
import { validateGSTIN, screenSanctions } from '@/lib/services/kyb-service';

const gstinCheck = validateGSTIN('29AAACA1234Z1ZA'); // { valid: true }
const sanctions = await screenSanctions('Apex Precision Engineering Ltd'); // { cleared: true, flags: [] }
```

---

### Module 5: Infrastructure, Telemetry & Resilience

#### 18. `GeminiKeyPool.getNextClient()`
* **File:** [`src/lib/services/gemini-key-pool.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/gemini-key-pool.ts)
* **Purpose:** Multi-key round-robin load balancer. Distributes inference across pools of Gemini API keys, automatically placing rate-limited keys (`429`) into cooldown and failing over to healthy keys.
* **Code Example:**
```typescript
import { geminiKeyPool } from '@/lib/services/gemini-key-pool';

const { client, keyIndex } = geminiKeyPool.getClient();
// Automatically fails over if keyIndex is in cooldown
```

#### 19. `CarrierService.track()`
* **File:** [`src/lib/services/carrier-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/carrier-service.ts)
* **Purpose:** Live logistics telemetry hub. Tracks real-time AWB updates across FedEx, DHL, BlueDart, and Delhivery with automated checkpoint status normalization (`IN_TRANSIT` → `DELIVERED`).
* **Code Example:**
```typescript
import { carrierService } from '@/lib/services/carrier-service';

const tracking = await carrierService.track('BLUEDART', 'BD-88992211-IN');
console.log(`Status: ${tracking.status}, Last Location: ${tracking.lastLocation}`);
```

#### 20. `WebhookService.dispatchWebhook()`
* **File:** [`src/lib/services/webhook-service.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/webhook-service.ts)
* **Purpose:** Dispatches real-time HMAC-SHA256 signed event notifications to ERP/Treasury endpoints for lifecycle milestones (`PO_RESERVED`, `DELIVERY_VERIFIED`, `PAYMENT_SETTLED`).
* **Code Example:**
```typescript
import { dispatchWebhook } from '@/lib/services/webhook-service';

await dispatchWebhook('tx-uuid-1045', 'DELIVERY_VERIFIED', {
  confidenceScore: 0.98,
  settlementReady: true,
}, ['buyer-id', 'seller-id']);
```

---

### Module 6: Identity, Access Control & Utilities

#### 21. `canAccessTransaction()`
* **File:** [`src/lib/auth.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/auth.ts)
* **Purpose:** Core access-control guard. Validates whether an authenticated user can read or execute mutations on a specific escrow transaction (permitting assigned Buyers, authorized Sellers, and platform Admins).
* **Code Example:**
```typescript
import { canAccessTransaction } from '@/lib/auth';

if (!canAccessTransaction(user, transaction)) {
  return Response.json({ error: 'Not authorized for this transaction' }, { status: 403 });
}
```

#### 22. `getUser()`
* **File:** [`src/lib/auth.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/auth.ts)
* **Purpose:** Securely parses and verifies HTTP-only authentication cookies, extracting active user identity and filtering out tombstoned sessions.
* **Code Example:**
```typescript
import { getUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  // Process authenticated request
}
```

#### 23. `findTransactionByIdOrNumber()`
* **File:** [`src/lib/db/transaction-utils.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/db/transaction-utils.ts)
* **Purpose:** Resilient database query utility that looks up orders by either internal UUID or human-readable tracking number (e.g. `RC-DEMO-1045` or `77146f09-b3a9-4658-a0f5-f257a5f55e5b`).
* **Code Example:**
```typescript
import { findTransactionByIdOrNumber } from '@/lib/db/transaction-utils';

const order = await findTransactionByIdOrNumber('RC-DEMO-1045');
```

---

## 📡 REST API Endpoints Matrix

| HTTP Method | Route | Associated Functions | Access Control | Purpose |
|---|---|---|---|---|
| `POST` | `/api/auth` | `signToken`, `compare`, `getUser` | Public | Authenticates credentials and issues secure HTTP-only cookies. |
| `GET` | `/api/transactions` | `canAccessTransaction`, Drizzle query | Buyer, Seller, Admin | Lists orders filtered by counterparty persona. |
| `POST` | `/api/transactions` | `ContractAgent`, `scryAgent`, `screenSanctions` | Buyer | Creates new purchase orders with AI contract clauses and anomaly screening. |
| `GET` | `/api/transactions/[id]` | `findTransactionByIdOrNumber`, `canAccessTransaction` | Participants, Admin | Fetches 360° order dossier (milestones, audit logs, dual-retention status). |
| `POST` | `/api/transactions/[id]/reserve` | `createPaymentReservation`, `lockCrossBorderFx` | Buyer, Admin | Irrevocably reserves funds in the escrow chamber and creates Virtual Accounts. |
| `POST` | `/api/transactions/[id]/documents` | `analyzeDocument`, `pHash`, dual-storage | Seller, Admin | Uploads delivery proof with perceptual duplicate check and auto-seller linking. |
| `POST` | `/api/transactions/[id]/verify` | `VisionAgent`, `verifyDeliveryEvidence` | Buyer, Admin | Triggers multimodal AI OCR verification against contract conditions. |
| `POST` | `/api/transactions/[id]/multisig` | `recordMultiSigSignature` | Buyer, Seller, Admin | Records cryptographic Step 1 / Step 2 counterparty co-signatures. |
| `POST` | `/api/transactions/[id]/execute` | `ExecutionAgent`, `capturePayment` | Buyer, Admin | Executes autonomous disbursement capture to seller bank accounts. |
| `POST` | `/api/transactions/[id]/tracking` | `carrierService.track` | Seller, Admin | Registers AWB tracking and syncs carrier logistics checkpoints. |
| `POST` | `/api/transactions/[id]/consignee-attestation` | Consignee signature stamp & GPS log | Participants, Admin | Records receiver on-site delivery acceptance. |
| `POST` | `/api/transactions/[id]/dynamic-discount` | `calculateDynamicDiscount` | Buyer, Seller | Applies sliding-scale dynamic discount for early milestone completion. |
| `POST` | `/api/transactions/[id]/cancel` | Mutual cancellation & refunding | Seller, Buyer, Admin | Records mutual release/refund back to the buyer's account. |
| `POST` | `/api/transactions/[id]/dispute` | Escrow freeze & arbitration logging | Buyer, Admin | Freezes auto-release timers and submits dispute evidence to arbitration. |
| `GET` | `/api/transactions/[id]/certificate` | `generateSettlementCertificatePdf` | Participants, Admin | Streams cryptographically signed PDF Settlement Certificate. |
| `GET` | `/api/transactions/[id]/audit-pdf` | `generateAuditDossierPDF` | Participants, Admin | Streams complete tamper-evident Merkle-tree anchored audit dossier. |
| `POST` | `/api/users/[id]/tombstone` | `executeUserTombstone`, `shredDEK` | Admin / Compliance | Executes statutory GDPR / DPDP right to be forgotten and KMS key destruction. |

---

## 🚀 Local Development Setup

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/sunny-bot18/Razorchain-AI.git
cd Razorchain-AI
npm install
```

### 2. Configure Environment Variables
Create `.env` in the root directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/razorchain"
NEXTAUTH_SECRET="your-32-character-secure-random-secret"
GOOGLE_API_KEY="your-google-gemini-api-key"
RAZORCHAIN_PAYMENT_PROVIDER="mock"
```

### 3. Initialize Database & Run Migrations
```bash
# Optional: Spin up local PostgreSQL container
docker run --name razorchain-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=razorchain -p 5432:5432 -d postgres:16-alpine

# Apply schema migrations
npx drizzle-kit push

# Start Next.js development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

---

## 🧪 Quality Checks & Test Suite

RazorChain AI enforces automated testing across financial calculations, multi-agent AI verification, cryptographic shredding, and order lifecycle flows:

```bash
# Run Vitest test suite (61 tests across 7 suites)
npm test

# Type-check TypeScript codebase
npx tsc --noEmit

# Production Next.js compilation (26 static/dynamic routes)
npm run build
```

**Automated Test Coverage:**
```text
 ✓ src/lib/services/resilience-fallbacks.test.ts (5 tests)
 ✓ src/lib/services/enterprise-features.test.ts (17 tests)
 ✓ src/lib/services/order-lifecycle-audit.test.ts (13 tests)
 ✓ src/lib/services/gemini-key-pool.test.ts (3 tests)
 ✓ src/lib/agents/verification-engine.test.ts (6 tests)
 ✓ src/lib/services/cryptographic-shredding-service.test.ts (5 tests)
 ✓ src/lib/services/financial-governance.test.ts (12 tests)

 Test Files  7 passed (7)
      Tests  61 passed (61)
```

---

## 🚢 Deployment on Vercel

1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Connect a PostgreSQL database (e.g. **Neon** or **Vercel Postgres** via the Storage tab).
4. Configure environment variables in Vercel:
   - `DATABASE_URL`: Automatically configured by Neon/Vercel Postgres.
   - `GOOGLE_API_KEY`: Your Google Gemini API key.
   - `NEXTAUTH_SECRET`: Random 32-character string.
   - `RAZORCHAIN_PAYMENT_PROVIDER`: `mock` (or `razorpay`).
5. Deploy! Vercel automatically compiles Next.js 16 and provisions edge/serverless routes.

---

## ⚖️ Copyright & Disclaimer of Liability

**Copyright © 2026 Yaswanth Chowdary ([@sunny-bot18](https://github.com/sunny-bot18)). All Rights Reserved.**

### Ownership Notice
All source code, software architectures, algorithms, multi-agent workflows, user interfaces, and intellectual property in this repository belong exclusively to **Yaswanth Chowdary** ([sunny-bot18/Razorchain-AI](https://github.com/sunny-bot18/Razorchain-AI)).

### Data Loss & File Erasure Disclaimer
> [!IMPORTANT]
> **NO RESPONSIBILITY FOR ERASED OR DELETED FILES**: The author and copyright holder (**Yaswanth Chowdary**) assumes **no responsibility, obligation, or liability** for any files, documents, records, encryption keys, media, or data that are erased, shredded, deleted, overwritten, purged, or lost from this Git repository, cloud databases, serverless `/tmp` storage, or deployed instances.
> 
> This includes, but is not limited to:
> - Automated data destruction via the platform's **Cryptographic Shredding Service** or key revocation routines.
> - Regulatory **Right to be Forgotten (GDPR / DPDP)** user tombstoning and PII purges.
> - Serverless container lifecycle resets, cache evictions, or storage boundary limits.
> - Manual, scripted, or administrative file deletions, commit pruning, or database resets.
>
> All software is provided strictly on an **"AS IS"** basis without warranty of any kind. Users and deploying entities are solely responsible for maintaining external, immutable backups of their files and data.

For complete terms and legal provisions, refer to the full [LICENSE](LICENSE) file.
