# RazorChain AI

<div align="center">

[![Live Production Website](https://img.shields.io/badge/Live%20Website-razorchain--ai.vercel.app-2563EB?style=for-the-badge&logo=vercel&logoColor=white)](https://razorchain-ai.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests Passing](https://img.shields.io/badge/Tests-59%2F59%20Passed-10B981?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

**Autonomous B2B Supply Chain Settlement Platform powered by Multi-Agent AI, Deterministic Financial Governance, and Cryptographic Multi-Sig Verification.**

[🌐 Explore the Live Website](https://razorchain-ai.vercel.app) · [📋 Architecture](#architecture) · [🚀 Quickstart](#run-locally) · [🧪 Verification & Tests](#quality-checks)

</div>

---

## 🌐 Live Production Deployment

RazorChain AI is deployed and live on Vercel:

👉 **[https://razorchain-ai.vercel.app](https://razorchain-ai.vercel.app)**

### 🔑 Demo Credentials

You can test the entire end-to-end workflow using these pre-seeded enterprise accounts (Password: `password123`):

| Role | Email | Capabilities |
|---|---|---|
| **Buyer** | `buyer@demo.com` | Create Purchase Orders, reserve escrow, approve milestones, trigger AI verification, release disbursements, download cryptographic certificates. |
| **Seller** | `seller@demo.com` | View incoming orders, upload shipping/delivery evidence, register carrier tracking (FedEx/DHL/Delhivery), pledge receivables for invoice factoring. |
| **Admin** | `admin@demo.com` | Full governance cockpit, manual vision triage overrides, dispute resolution, compliance tombstoning, and RBI Nodal batch clearing. |

> **Tip:** You can also use the **Quick Role Switcher** (`Buyer` \| `Seller` \| `Admin`) pinned in the top navigation bar to seamlessly jump between counterparties in one click!

---

## ⚡ What is Real and What is Simulated

- **Payment Settlement**: Uses the official Razorpay Node SDK when `RAZORCHAIN_PAYMENT_PROVIDER=razorpay` with valid `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. By default, it operates in a self-contained simulated nodal chamber—no real bank funds are debited or transferred.
- **Multimodal AI Verification**: Powered by Google's GA `gemini-2.5-flash` model when `GOOGLE_API_KEY` is configured. The platform includes a **GeminiKeyPool** with round-robin load balancing and automatic cooldown failovers. Without an API key, an offline deterministic fixture parser is used for reproducible testing.
- **Dual-Layer Persistence on Serverless**: Uploaded evidence files are stored in writable serverless `/tmp` while simultaneously encoded into PostgreSQL (`schema.documents.forensicMetadata.contentBase64`) for serverless container rehydration across ephemeral Lambda cold starts.
- **Four-Eyes Governance (Maker-Checker)**: High-value transactions (≥ ₹10,00,000) require dual counterparty multi-sig approval (Step 1: Buyer release authorization, Step 2: Seller settlement acceptance) before funds can be disbursed.
- **Cryptographic Auditability**: Generates tamper-evident PDF Settlement Certificates signed with HMAC-SHA256 and Merkle-tree anchored audit dossiers verifiable against cryptographic proofs.

---

## 🏗️ Architecture

```text
Buyer / Seller / Admin UI  ──( Next.js 16 App Router )──>  API Route Handlers
                                                                   │
    ┌──────────────────────────────────────────────────────────────┴──────────────────────────────┐
    ▼                                                              ▼                              ▼
Contract Agent                                             Vision Agent + Aegis          Deterministic Verification
(Gemini 2.5 Flash / Schema Validation)                     (Multimodal OCR & Anti-Fraud)   (PO, Line Items & SLA checks)
    │                                                              │                              │
    └──────────────────────────────────────────────────────────────┼──────────────────────────────┘
                                                                   ▼
                                                       Four-Eyes Multi-Sig
                                                     (Buyer + Seller Dual Sign)
                                                                   │
                                                                   ▼
                                                        Execution Agent / Vault
                                                   (Razorpay Nodal SDK / Mock Vault)
                                                                   │
                                                                   ▼
                                                     PostgreSQL (Neon / Drizzle)
                                                    + Merkle Audit Proofs & PDFs
```

The LLM extracts structured data from multi-format evidence (PDF invoices, delivery receipts, bills of lading, consignment photos). `verification-engine.ts` mathematically cross-checks invoice line items, recipient signatures, and GPS coordinates against the purchase contract. Capture is authorized only when:
1. Verification result is `APPROVED` with confidence above threshold (or verified via auditable Admin override).
2. Aegis security check confirms `SAFE` (free of adversarial prompt injections or duplicate hash collisions).
3. Payment reservation is `AUTHORIZED` in the escrow chamber.
4. Multi-sig dual signatures are satisfied for high-value orders.
5. No prior payment execution exists (strict idempotency).

---

## 🔄 Autonomous Settlement Lifecycle

1. **Purchase Order Creation**: Buyer creates a B2B contract with delivery SLA, inspection window, and milestone payments.
2. **Escrow Reservation**: Dedicated Virtual Account (VAN) is generated with partner bank IFSC (Axis / Yes Bank / HDFC) and funds are irrevocably locked.
3. **Carrier & Consignee Attestation**: Carrier records tracking and consignee receiver submits GPS-stamped physical delivery attestation.
4. **Evidence Upload**: Seller submits invoice, consignment receipt, and delivery challan (dual-persisted to disk + database).
5. **AI Multi-Agent Verification**: Gemini Vision Agent extracts data, Aegis screens for prompt injections, and the verification engine grades confidence.
6. **Dispute / Triage Handling**: If discrepancies exist, auto-release timers halt; operations analysts can review via Manual Vision Triage or resolve disputes.
7. **Four-Eyes Dual Multi-Sig**: High-value disbursements require independent cryptographic signatures from both Buyer and Seller.
8. **Disbursement & Certification**: Funds are released to the seller, and both parties receive a cryptographically signed PDF Settlement Certificate and Merkle Audit Dossier.

---

## 🚀 Run Locally

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/sunny-bot18/Razorchain-AI.git
cd Razorchain-AI
npm install
```

### 2. Configure Environment
Create a `.env` file (refer to `.env.example`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/razorchain"
NEXTAUTH_SECRET="your-32-char-random-secret"
GOOGLE_API_KEY="your-gemini-api-key"
RAZORCHAIN_PAYMENT_PROVIDER="mock"
```

### 3. Initialize Database & Seed
```bash
# Start local PostgreSQL via Docker
docker compose up db -d

# Run Drizzle migrations
npx drizzle-kit migrate

# Start Next.js development server
npm run dev
```

### 4. Access the Cockpit
- Open [http://localhost:3000](http://localhost:3000).
- Click **Get Started** or **Launch Demo**.
- Sign in with `buyer@demo.com` / `password123`.

---

## 🧪 Quality Checks & Test Suite

The project includes an automated test suite verifying financial calculations, Merkle trees, forensic checks, and complete order lifecycle flows:

```bash
# Run all Vitest unit and integration test suites
npm test

# Type-check TypeScript codebase
npx tsc --noEmit

# Production Next.js compilation
npm run build
```

**Test Coverage Results:**
```
 ✓ src/lib/services/resilience-fallbacks.test.ts (5 tests)
 ✓ src/lib/services/enterprise-features.test.ts (17 tests)
 ✓ src/lib/services/order-lifecycle-audit.test.ts (13 tests)
 ✓ src/lib/services/gemini-key-pool.test.ts (3 tests)
 ✓ src/lib/agents/verification-engine.test.ts (4 tests)
 ✓ src/lib/services/cryptographic-shredding-service.test.ts (5 tests)
 ✓ src/lib/services/financial-governance.test.ts (12 tests)

 Test Files  7 passed (7)
      Tests  59 passed (59)
```

---

## 🚢 Deployment on Vercel

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Connect a PostgreSQL database (e.g., **Vercel Postgres** or **Neon** via the Storage tab).
4. Configure the environment variables in Vercel Project Settings:
   - `DATABASE_URL`: Automatically configured by Vercel Postgres/Neon.
   - `GOOGLE_API_KEY`: Your Google Gemini API key.
   - `NEXTAUTH_SECRET`: A secure random 32-character string.
   - `RAZORCHAIN_PAYMENT_PROVIDER`: `mock` (or `razorpay`).
5. Deploy! Vercel automatically runs Next.js builds and provisions serverless edge routes.

---

## ⚖️ Copyright & Disclaimer of Liability

**Copyright © 2026 Yaswanth Chowdary ([@sunny-bot18](https://github.com/sunny-bot18)). All Rights Reserved.**

### Ownership Notice
All source code, architectures, software designs, multi-agent frameworks, smart contracts, and intellectual property in this repository belong exclusively to **Yaswanth Chowdary** ([sunny-bot18/Razorchain-AI](https://github.com/sunny-bot18/Razorchain-AI)).

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
