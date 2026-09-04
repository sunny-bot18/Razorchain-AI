# Scoped Resilience Matrix & Outage Fallback Architecture

This document details the architectural design and full-stack implementation of the **Scoped Resilience Router & Outage Fallbacks** in RazorChain AI.

---

## 1. Architectural Philosophy: Scoped Router vs. Global Bypass

In an RBI-compliant B2B escrow platform, an external third-party API outage must **never trigger a global "approve-all" bypass**. Disabling security or compliance checks globally invites systemic fraud.

Instead, the **Resilience Matrix** acts as an **intelligent, scoped exception router**:
1. When an external API times out, fails, or degrades, only the **specific affected transaction** (`Order ID`) is routed into a dedicated, high-assurance manual queue.
2. Unaffected transactions continue their automated lifecycle normally.
3. Every fallback intervention requires **cryptographic proof**, **role-based authorization**, and an **immutable audit trail anchor**.

```
                           ┌──────────────────────────────────────────────┐
                           │      External Dependency Health Router       │
                           └──────────────────────┬───────────────────────┘
                                                  │
                ┌─────────────────────────────────┼────────────────────────────────┐
                ▼                                 ▼                                ▼
    ┌───────────────────────┐         ┌───────────────────────┐        ┌───────────────────────┐
    │  Google Gemini Vision │         │   Carrier Logistics   │        │     Razorpay / RBI    │
    │      AI Outage        │         │   Telemetry Outage    │        │  Nodal Gateway Outage │
    └───────────┬───────────┘         └───────────┬───────────┘        └───────────┬───────────┘
                │                                 │                                │
                ▼                                 ▼                                ▼
       State Transition:                 State Transition:                State Transition:
    AWAITING_MANUAL_TRIAGE             IN_TRANSIT_UNVERIFIED              SETTLEMENT_QUEUED
                │                                 │                                │
                ▼                                 ▼                                ▼
    ┌───────────────────────┐         ┌───────────────────────┐        ┌───────────────────────┐
    │  Ops Manual Vision    │         │  Consignee Manual     │        │  Overnight Batch      │
    │  Triage Workbench     │         │  GPS & POD Attestation│        │  Atomic Idempotent    │
    │  (Certified stamps &  │         │  (HTML5 Geolocation + │        │  Clearing Engine      │
    │   PO line-items)      │         │   Signatory Identity) │        │  (Deterministic Key)  │
    └───────────────────────┘         └───────────────────────┘        └───────────────────────┘
```

---

## 2. The 3 Scoped Fallback Workflows

### 1. Google Gemini Vision Outage $\rightarrow$ Scoped Manual Vision Triage

- **The Trigger**: Seller uploads delivery challan/invoice. Automated AI extraction times out or returns `503 Service Unavailable`.
- **State Transition**: Transaction transitions to `AWAITING_MANUAL_TRIAGE` (instead of `VERIFICATION_FAILED` or auto-approving).
- **Security & Authorization**:
  - Only **Admin / Compliance Officers** can access the Triage Workbench.
  - The reviewer certifies receiver stamp presence, date legibility, and PO SKU quantity matches.
  - Generates immutable audit log: `MANUAL_VISION_OVERRIDE_CERTIFIED` with reviewer ID, timestamp, and signed compliance notes.
- **Backend Route**: `POST /api/transactions/[id]/manual-vision-triage`

---

### 2. Multi-Carrier Logistics Outage $\rightarrow$ Manual Consignee Attestation

- **The Trigger**: Third-party carrier tracking webhooks (BlueDart / Delhivery) are unresponsive, timed out, or unverified.
- **State Transition**: Transaction is held in `IN_TRANSIT_UNVERIFIED` (or `carrierStatus = 'UNAVAILABLE'`).
- **Consignee Proof Protocol**:
  - The **Buyer (Consignee)** sees an urgent action prompt: *"Carrier tracking is currently unavailable for Order #.... To release funds to your seller, please provide manual attestation."*
  - Captures **HTML5 Geolocation Coordinates** (`latitude`, `longitude`, `accuracy` in meters) directly at the delivery site.
  - Records authorized receiver signatory name (e.g., Warehouse Receiving Manager) and physical Delivery Challan filename.
  - Transitions order status to `VERIFICATION_PENDING` and anchors `CONSIGNEE_POD_ATTESTED` to the Merkle audit trail.
- **Backend Route**: `POST /api/transactions/[id]/consignee-attestation`

---

### 3. Razorpay / RBI Nodal Outage $\rightarrow$ Overnight Settlement Batch Queue

- **The Trigger**: Payment gateway is in maintenance or RBI RTGS/NEFT clearing window is offline.
- **State Transition**: Verified orders transition to `SETTLEMENT_QUEUED`.
- **Atomic Batch Settlement Engine**:
  - Admin dashboard displays the **Pending Settlement Batch Queue** with queued counts and aggregate volume in INR.
  - When the clearing window opens, Admin clicks **"Execute Batch"**.
  - **Deterministic Idempotency Key**:
    $$\text{IdempotencyKey} = \text{batch-settle-} \langle \text{id} \rangle \text{-} \text{SHA256}(\langle \text{id} \rangle \text{-} \langle \text{amount} \rangle)_{0:16}$$
  - Guarantees **exact-once execution**: re-submitting or re-clicking never causes double-disbursement.
  - Records `BATCH_SETTLEMENT_EXECUTED` with batch window metadata and dispatches webhooks.
- **Backend Route**: `POST /api/admin/settlement-batch` and `GET /api/admin/settlement-batch`

---

## 3. Implementation Summary

| Component / Layer | Location | Key Capabilities |
| :--- | :--- | :--- |
| **Database Enums** | [`schema.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/db/schema.ts) | Live PostgreSQL `transaction_status` enum with `AWAITING_MANUAL_TRIAGE`, `IN_TRANSIT_UNVERIFIED`, `SETTLEMENT_QUEUED` |
| **Status Badges** | [`status-badge.tsx`](file:///Users/sunnymacbook/razorchain-ai/src/components/status-badge.tsx) | Visual color coding, icons, and labels for all fallback states |
| **Resilience Bar** | [`system-health-degradation-bar.tsx`](file:///Users/sunnymacbook/razorchain-ai/src/components/resilience/system-health-degradation-bar.tsx) | Live telemetry bar with simulation switches and scoped fallback modals |
| **Transaction Detail** | [`buyer/transaction/[id]/page.tsx`](file:///Users/sunnymacbook/razorchain-ai/src/app/(dashboard)/buyer/transaction/[id]/page.tsx) | Prominent scoped banners for Manual Triage, GPS Consignee Attestation, and Batch Settlement |
| **Action Inbox** | [`action-inbox-dashboard.tsx`](file:///Users/sunnymacbook/razorchain-ai/src/components/dashboard/action-inbox-dashboard.tsx) | Quick filter presets (`👁️ Manual Triage`, `📦 Batch Queue`) and Action Drawer links |
| **Triage API** | [`manual-vision-triage/route.ts`](file:///Users/sunnymacbook/razorchain-ai/src/app/api/transactions/[id]/manual-vision-triage/route.ts) | Admin review and PO specification matching |
| **Attestation API** | [`consignee-attestation/route.ts`](file:///Users/sunnymacbook/razorchain-ai/src/app/api/transactions/[id]/consignee-attestation/route.ts) | GPS stamp capture and consignee signature verification |
| **Batch Clearing API** | [`settlement-batch/route.ts`](file:///Users/sunnymacbook/razorchain-ai/src/app/api/admin/settlement-batch/route.ts) | Idempotent multi-order clearing engine |
| **Test Suite** | [`resilience-fallbacks.test.ts`](file:///Users/sunnymacbook/razorchain-ai/src/lib/services/resilience-fallbacks.test.ts) | Automated unit tests covering all 3 fallback paths |

---

## 4. Verification

- **Vitest**: All 40 unit and integration tests passing (`npx vitest run`).
- **Next.js**: Production build compiles with zero TypeScript or Webpack errors (`npx next build --webpack`).
