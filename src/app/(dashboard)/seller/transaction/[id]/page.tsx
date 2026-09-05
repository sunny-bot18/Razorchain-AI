'use client';

import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2,
  FileText,
  Loader2,
  UploadCloud,
  AlertCircle,
  Receipt,
  Truck,
  ClipboardList,
  PenLine,
  Hash,
  Package,
  MapPin,
  Calendar,
  MessageSquare,
  Send,
  Download,
  Sparkles,
  ExternalLink,
  FilePlus2,
} from 'lucide-react';
import StatusBadge from '@/components/status-badge';
import { formatDate, formatINR } from '@/lib/utils';
import { MakerCheckerPanel } from '@/components/governance/maker-checker-panel';
import { RiskSignalsPanel } from '@/components/risk/risk-signals-panel';
import { FinancialAmount } from '@/components/ui/financial-amount';
import { FreshnessIndicator } from '@/components/ui/freshness-indicator';
import { TypedConfirmationDialog } from '@/components/ui/alert-dialog';
import { TombstoneBadge } from '@/components/privacy/tombstone-badge';
import { ShreddedDocumentCard } from '@/components/privacy/shredded-document-card';
import { maskPII } from '@/components/privacy/tombstone-mask';

type Transaction = {
  id: string;
  transactionNumber: string;
  status: string;
  poNumber: string;
  productDescription: string;
  quantity: number;
  amount: number;
  deliveryAddress: string;
  expectedDeliveryDate: string;
  buyerName?: string;
  sellerName?: string;
  buyerIsTombstoned?: boolean;
  buyerTombstonedAt?: string | null;
  sellerIsTombstoned?: boolean;
  sellerTombstonedAt?: string | null;
  requiresDualApproval?: boolean;
  firstApproverId?: string | null;
  firstApprovedAt?: string | null;
  secondApproverId?: string | null;
  secondApprovedAt?: string | null;
  isFactored?: boolean;
  factoringLender?: string | null;
  factoringAdvanceAmount?: number | null;
};
type Document = {
  id: string;
  fileName: string;
  fileType?: string;
  fileSize: number;
  fileHash?: string;
  uploadedAt: string;
  isShredded?: boolean;
  shreddedAt?: string | null;
  dekKeyId?: string | null;
  shreddedReason?: string | null;
};
type Detail = {
  viewer?: { id: string; role: string } | null;
  transaction: Transaction;
  documents: Document[];
  contract?: { requiredChecks?: string[] } | null;
  securityCheck?: { flags?: string[]; riskScore?: number } | null;
  adminResolution?: { decision: 'APPROVED' | 'REJECTED'; reason: string; approvedBy: string; resolvedAt: string } | null;
};

// ─── Document type guide data ─────────────────────────────────────────────────

interface DocField { icon: React.ElementType; label: string; example: string }
interface DocGuide {
  key: string;
  label: string;
  icon: React.ElementType;
  borderColor: string;
  headerBg: string;
  headerText: string;
  fields: DocField[];
  tip: string;
}

const INVOICE_GUIDE: DocGuide = {
  key: 'invoice',
  label: 'Invoice',
  icon: Receipt,
  borderColor: 'border-blue-500/30',
  headerBg: 'bg-blue-500/10',
  headerText: 'text-blue-300',
  fields: [
    { icon: Hash,     label: 'PO Number',           example: 'PO-2026-1045' },
    { icon: Package,  label: 'Quantity',             example: '500 units' },
    { icon: MapPin,   label: 'Delivery Address',     example: 'Bengaluru' },
    { icon: PenLine,  label: 'Authorized Signature', example: '[Signed] / stamp' },
  ],
  tip: 'Include company letterhead, PO reference, line-item quantity, and an authorized signature.',
};

const SHIPPING_GUIDE: DocGuide = {
  key: 'shipping_manifest',
  label: 'Shipping Manifest',
  icon: Truck,
  borderColor: 'border-violet-500/30',
  headerBg: 'bg-violet-500/10',
  headerText: 'text-violet-300',
  fields: [
    { icon: Hash,     label: 'PO / Reference',   example: 'PO-2026-1045' },
    { icon: Package,  label: 'Quantity Shipped',  example: '500 units / 5 cartons' },
    { icon: Calendar, label: 'Shipment Date',     example: '2026-09-04' },
    { icon: Truck,    label: 'Carrier & Tracking',example: 'Blue Dart BD9876…' },
  ],
  tip: 'Carrier-issued document showing consignee, total packages, weight, and tracking number.',
};

const DELIVERY_RECEIPT_GUIDE: DocGuide = {
  key: 'delivery_receipt',
  label: 'Delivery Receipt',
  icon: ClipboardList,
  borderColor: 'border-emerald-500/30',
  headerBg: 'bg-emerald-500/10',
  headerText: 'text-emerald-300',
  fields: [
    { icon: Hash,     label: 'PO Reference',      example: 'PO-2026-1045' },
    { icon: MapPin,   label: 'Delivery Address',   example: 'Bengaluru' },
    { icon: Calendar, label: 'Delivery Date',      example: '2026-09-04' },
    { icon: PenLine,  label: 'Receiver Signature', example: 'Rajesh Kumar [Signed]' },
  ],
  tip: 'Must be signed by the goods receiver at the destination site with date and address visible.',
};

const ALL_GUIDES: DocGuide[] = [INVOICE_GUIDE, SHIPPING_GUIDE, DELIVERY_RECEIPT_GUIDE];

const CHECK_TO_GUIDES: Record<string, string[]> = {
  po_number_match:         ['invoice', 'delivery_receipt', 'shipping_manifest'],
  quantity_match:          ['invoice', 'shipping_manifest'],
  delivery_address_match:  ['delivery_receipt', 'invoice'],
  delivery_date_valid:     ['delivery_receipt', 'shipping_manifest'],
  signed_delivery_proof:   ['delivery_receipt'],
  document_validity:       ['invoice', 'delivery_receipt', 'shipping_manifest'],
};

function getRequiredGuides(checks: string[] | undefined): DocGuide[] {
  if (!checks || checks.length === 0) return ALL_GUIDES;
  const needed = new Set<string>();
  checks.forEach((c) => (CHECK_TO_GUIDES[c] ?? []).forEach((g) => needed.add(g)));
  return ALL_GUIDES.filter((g) => needed.has(g.key));
}

function DocGuideCard({ guide }: { guide: DocGuide }) {
  const Icon = guide.icon;
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border ${guide.borderColor} bg-zinc-950`}>
      <div className={`flex items-center gap-2 px-4 py-3 ${guide.headerBg} ${guide.headerText}`}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">{guide.label}</span>
        <span className="ml-auto rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide opacity-80">
          Required
        </span>
      </div>

      <div className="flex-1 space-y-2 bg-zinc-950/80 px-4 py-3 font-mono text-[11px]">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">{guide.label}</p>
        {guide.fields.map((f) => {
          const FIcon = f.icon;
          return (
            <div key={f.label} className="flex items-start gap-2">
              <FIcon className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600" />
              <span className="w-28 shrink-0 text-zinc-500">{f.label}:</span>
              <span className="truncate text-zinc-200">{f.example}</span>
            </div>
          );
        })}
        <div className="mt-1 flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>AI will verify these fields</span>
        </div>
      </div>

      <div className="flex items-start gap-2 border-t border-zinc-800/60 px-4 py-2.5 text-[11px] text-zinc-500">
        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
        <span>{guide.tip}</span>
      </div>
    </div>
  );
}

const DEMO_FIXTURES_SET_1 = [
  { file: '1_clean_delivery_challan.jpg', label: '1. Delivery Challan', desc: '500 units, Bengaluru (PO-2026-1045)' },
  { file: '2_commercial_tax_invoice.jpg', label: '2. Tax Invoice', desc: '₹10,000 GST invoice (PO-2026-1045)' },
  { file: '3_carrier_bluedart_airwaybill.jpg', label: '3. BlueDart AWB', desc: 'Carrier logistics consignment note' },
  { file: '4_tampered_quantity_fraud.jpg', label: '4. Tampered Fraud', desc: 'Contract discrepancy mismatch test' },
  { file: '5_cnc_actuators_delivery_proof.jpg', label: '5. CNC Actuators', desc: '₹4.5L Servo actuators (PO-2026-AI-881)' },
];

const DEMO_FIXTURES_SET_2 = [
  { file: '6_goods_receipt_note_grn.jpg', label: '6. Inward GRN', desc: 'Warehouse QA acceptance (PO-2026-1045)' },
  { file: '7_medical_stents_delivery_challan.jpg', label: '7. Medical Stents Challan', desc: '1,200 stents cold-chain (PO-2026-LOG-402)' },
  { file: '8_medical_stents_tax_invoice.jpg', label: '8. Medical Tax Invoice', desc: '₹12,00,000 GST invoice (PO-2026-LOG-402)' },
  { file: '9_solar_pv_cells_delivery_challan.jpg', label: '9. Solar PV Challan', desc: '3,000 PV cells ₹25L (PO-2026-BANK-770)' },
  { file: '10_address_mismatch_wrong_warehouse.jpg', label: '10. Address Mismatch', desc: 'Misrouted to Mumbai/Bhiwandi test' },
  { file: '11_short_shipment_partial_delivery.jpg', label: '11. Short Shipment', desc: '420 delivered vs 500 ordered test' },
  { file: '12_expired_sla_delayed_delivery.jpg', label: '12. Delayed Delivery', desc: '25-day late delivery SLA test' },
  { file: '13_transporter_lorry_receipt_lr.jpg', label: '13. Transporter LR (Bilty)', desc: 'V-Trans road consignment receipt' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingSubmitting, setTrackingSubmitting] = useState(false);
  const [trackingNotice, setTrackingNotice] = useState<string | null>(null);
  const [allowDuplicateMode, setAllowDuplicateMode] = useState(false);
  const [demoSetTab, setDemoSetTab] = useState<'set2' | 'set1'>('set2');
  const [messageInput, setMessageInput] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [signingMultiSig, setSigningMultiSig] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { credentials: 'include' });
      if (res.status === 401) return router.replace('/login');
      if (!res.ok) {
        setData(null);
        throw new Error((await res.json()).error || 'Unable to load order');
      }
      const json = await res.json();
      if (json.viewer?.role === 'BUYER') {
        router.replace(`/buyer/transaction/${id}`);
        return;
      }
      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Unable to load order');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const chooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    const invalid = selected.find(
      (f) =>
        f.size > 10 * 1024 * 1024 ||
        (!f.type.startsWith('image/') && f.type !== 'application/pdf' && f.type !== 'text/plain'),
    );
    if (invalid) {
      setError(`${invalid.name} must be an image, PDF, or .txt demo fixture under 10 MB.`);
      return;
    }
    setError(null);
    setFiles(selected);
  };

  const attachDemoFile = async (fileName: string) => {
    try {
      setUploading(true);
      setError(null);
      const res = await fetch(`/demo-docs/${fileName}`);
      if (!res.ok) throw new Error(`Could not load demo document: ${fileName}`);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      setFiles((prev) => {
        const exists = prev.some((f) => f.name === fileName);
        return exists ? prev : [...prev, file];
      });
      setNotice(`Ready to upload demo document "${fileName}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo document');
    } finally {
      setUploading(false);
    }
  };

  const upload = async (forceAllowDuplicate = false) => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const body = new FormData();
      files.forEach((f) => body.append('files', f));
      if (forceAllowDuplicate || allowDuplicateMode) {
        body.append('allowDuplicate', 'true');
      }
      const res = await fetch(`/api/transactions/${id}/documents`, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Upload failed');
      if (result.errors && result.errors.length > 0 && result.uploadedCount === 0) {
        throw new Error(result.errors[0]?.error || 'Document validation failed');
      }
      setFiles([]);
      setAllowDuplicateMode(false);
      setNotice(
        `${result.uploadedCount} file${result.uploadedCount !== 1 ? 's' : ''} uploaded successfully. The buyer can now run verification.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const requestRefund = async () => {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/transactions/${id}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: refundReason.trim() ? { 'Content-Type': 'application/json' } : undefined,
        body: refundReason.trim() ? JSON.stringify({ reason: refundReason }) : undefined,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Refund request failed');
      setRefundReason('');
      setNotice('Refund request recorded. The buyer will see the updated transaction status.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refund request failed');
    }
  };

  const submitTracking = async () => {
    if (!trackingNumber.trim() || !carrier) return;
    setTrackingSubmitting(true);
    setTrackingNotice(null);
    try {
      const res = await fetch(`/api/transactions/${id}/tracking`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: trackingNumber.trim(), carrier }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to submit tracking'); }
      setTrackingNotice(`Tracking number ${trackingNumber.trim()} (${carrier}) registered successfully.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit tracking');
    } finally {
      setTrackingSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;
    setMessageSending(true);
    try {
      const res = await fetch(`/api/transactions/${id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: messageInput.trim() }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to send message'); }
      setMessageInput('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setMessageSending(false);
    }
  };

  const [factoringLoading, setFactoringLoading] = useState(false);
  const [factoringSuccess, setFactoringSuccess] = useState<string | null>(null);

  const requestFactoring = async () => {
    if (!id || !data) return;
    setFactoringLoading(true);
    try {
      const res = await fetch('/api/factoring', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: id,
          lenderId: 'len_kredx_01',
          lenderName: 'KredX Enterprise Trade Credit',
          advancePercentage: 85,
          discountFeePercentage: 2.5,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to request factoring');
      setFactoringSuccess(resData.message);
      await load();
    } catch (err: any) {
      setError(err.message || 'Factoring request failed');
    } finally {
      setFactoringLoading(false);
    }
  };

  if (loading && !data)
    return (
      <div className="flex justify-center py-24 text-zinc-500">
        <Loader2 className="mr-2 animate-spin" />
        Loading order…
      </div>
    );

  if (!data)
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
        {error || 'Order not found'}
      </p>
    );

  const { transaction: tx } = data;
  const canUpload = !['SETTLED', 'CANCELLED', 'REFUNDED'].includes(tx.status);
  const requiredGuides = getRequiredGuides(data.contract?.requiredChecks);

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ── Header & Freshness ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{tx.transactionNumber}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-zinc-500">
              Delivery evidence for {tx.buyerIsTombstoned ? maskPII(tx.buyerName, 'name') : (tx.buyerName || 'buyer')}
            </span>
            {tx.buyerIsTombstoned && <TombstoneBadge variant="compact" />}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {tx.status === 'SETTLED' && (
            <button
              type="button"
              onClick={() => window.open(`/api/transactions/${id}/certificate`, '_blank')}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Settlement Certificate</span>
            </button>
          )}
          <FreshnessIndicator lastUpdated={lastUpdated} isSyncing={loading} onRefresh={load} />
          <StatusBadge status={tx.status} />
        </div>
      </div>

      {/* ── Order summary with Financial Certainty ── */}
      <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-zinc-500">Buyer Entity</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-zinc-200">
              {tx.buyerIsTombstoned ? maskPII(tx.buyerName, 'name') : (tx.buyerName || 'Acme Manufacturing Corp')}
            </span>
            {tx.buyerIsTombstoned && <TombstoneBadge variant="compact" />}
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Purchase order</p>
          <p className="mt-1 text-sm font-medium text-zinc-200">{tx.poNumber}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Quantity</p>
          <p className="mt-1 text-sm font-medium text-zinc-200">{tx.quantity} units</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Escrow Receivable</p>
          <div className="mt-1 text-sm">
            <FinancialAmount amount={tx.amount} status={tx.status} showBadge />
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Expected delivery by</p>
          <p className="mt-1 text-sm font-medium text-zinc-200">{formatDate(tx.expectedDeliveryDate)}</p>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="text-xs text-zinc-500">Delivery address</p>
          <p className="mt-1 text-sm font-medium text-zinc-200">
            {tx.buyerIsTombstoned ? maskPII(tx.deliveryAddress, 'address') : tx.deliveryAddress}
          </p>
        </div>
      </section>


      {/* ── Multi-Dimensional Risk & Behavior Signals Panel ── */}
      <RiskSignalsPanel
        transactionAmount={tx.amount}
        status={tx.status}
        deliveryAddress={tx.deliveryAddress}
        forensicFlags={data.securityCheck?.flags}
        requiresDualApproval={tx.requiresDualApproval}
        firstApproverId={tx.firstApproverId}
        secondApproverId={tx.secondApproverId}
      />

      {/* ── Four-Eyes Governance: Dual Counterparty Multi-Sig Widget ── */}
      <MakerCheckerPanel
        transactionId={tx.id}
        amount={tx.amount}
        requiresDualApproval={tx.requiresDualApproval}
        firstApproverId={tx.firstApproverId}
        firstApprovedAt={tx.firstApprovedAt}
        firstApproverName={(tx as any).firstApproverName}
        secondApproverId={tx.secondApproverId}
        secondApprovedAt={tx.secondApprovedAt}
        secondApproverName={(tx as any).secondApproverName}
        buyerName={tx.buyerName || 'Buyer Entity'}
        sellerName={tx.sellerName || 'Seller Enterprise'}
        currentUserRole="SELLER"
        status={tx.status}
        onApproveSignature={async (step) => {
          setSigningMultiSig(true);
          setError(null);
          try {
            const res = await fetch(`/api/transactions/${tx.id}/multisig`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ step }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Signature failed');
            setNotice(result.message || 'Signature cryptographically recorded.');
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Multi-sig signing failed');
          } finally {
            setSigningMultiSig(false);
          }
        }}
        isLoading={signingMultiSig}
      />

      {data.adminResolution && (
        <section className={`rounded-xl border p-5 ${data.adminResolution.decision === 'APPROVED' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
          <p className={`text-sm font-semibold ${data.adminResolution.decision === 'APPROVED' ? 'text-emerald-200' : 'text-red-200'}`}>Admin decision: {data.adminResolution.decision}</p>
          <p className="mt-2 text-sm text-zinc-200">{data.adminResolution.reason}</p>
          <p className="mt-2 text-xs text-zinc-400">Reviewed by {data.adminResolution.approvedBy} · {formatDate(data.adminResolution.resolvedAt)}</p>
        </section>
      )}

      {/* ── Delivery Refund Trigger with Typed Confirmation ── */}
      {['PAYMENT_AUTHORIZED', 'FUNDS_RESERVED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING', 'VERIFICATION_FAILED', 'MANUAL_REVIEW', 'VERIFIED'].includes(tx.status) && (
        <section className="rounded-xl border border-red-500/25 bg-red-500/5 p-6">
          <h2 className="text-sm font-semibold text-red-200">Unable to fulfill order?</h2>
          <p className="mt-1 text-sm text-zinc-400">Voluntarily return reserved funds to the buyer. This action will be signed and recorded in the audit trail.</p>
          <div className="mt-3">
            <button
              onClick={() => setRefundModalOpen(true)}
              className="rounded-lg border border-red-500/50 bg-zinc-950 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 transition-colors"
            >
              Request Escrow Refund…
            </button>
          </div>
        </section>
      )}



      {/* ── Carrier tracking entry ── */}
      {['FUNDS_RESERVED', 'DELIVERY_PENDING', 'VERIFICATION_PENDING', 'VERIFICATION_FAILED'].includes(tx.status) && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Truck className="h-4 w-4 text-blue-400" />
            Register tracking number
          </h2>
          <p className="mb-4 text-xs text-zinc-500">Enter your AWB / tracking number before uploading documents. This is used to automatically corroborate delivery with the carrier during verification.</p>
          {(data.transaction as { trackingNumber?: string | null }).trackingNumber && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              Current: <span className="font-mono font-semibold">{(data.transaction as { trackingNumber?: string; carrier?: string }).trackingNumber}</span>
              {' '}via <span className="font-semibold">{(data.transaction as { carrier?: string }).carrier}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="">Carrier</option>
              <option value="FEDEX">FedEx</option>
              <option value="DHL">DHL</option>
              <option value="BLUEDART">BlueDart</option>
              <option value="DELHIVERY">Delhivery</option>
              <option value="OTHER">Other</option>
            </select>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="AWB / tracking number"
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <button
              onClick={submitTracking}
              disabled={trackingSubmitting || !trackingNumber.trim() || !carrier}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-blue-500"
            >
              {trackingSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
          {trackingNotice && <p className="mt-3 text-xs text-emerald-300">{trackingNotice}</p>}
        </section>
      )}

      {/* ── Clarification channel ── */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <MessageSquare className="h-4 w-4 text-violet-400" />
          Clarification channel
          <span className="ml-auto text-xs text-zinc-500">
            {(data as { messages?: Array<unknown> }).messages?.length ?? 0} messages
          </span>
        </h2>
        <div className="max-h-48 overflow-y-auto space-y-3 mb-4">
          {!(data as { messages?: Array<{ id: string; senderName?: string; senderRole?: string; body: string; createdAt: string; flaggedCheck?: string | null }> }).messages?.length ? (
            <p className="text-xs text-zinc-500 text-center py-3">No messages yet. Start the conversation to ask the buyer about any discrepancies.</p>
          ) : (
            (data as { messages?: Array<{ id: string; senderName?: string; senderRole?: string; body: string; createdAt: string; flaggedCheck?: string | null }> }).messages?.map((m) => (
              <div key={m.id} className="flex gap-2">
                <div className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold ${m.senderRole === 'BUYER' ? 'bg-blue-500/20 text-blue-400' : m.senderRole === 'ADMIN' ? 'bg-amber-500/20 text-amber-400' : 'bg-violet-500/20 text-violet-400'}`}>
                  {(m.senderName ?? 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">{m.senderName} · {m.senderRole} · {formatDate(m.createdAt)}</p>
                  <div className="rounded-xl rounded-tl-sm bg-zinc-800 px-3 py-2 text-sm text-zinc-200">
                    {m.flaggedCheck && <p className="mb-1 text-xs opacity-60">re: {m.flaggedCheck.replace(/_/g, ' ')}</p>}
                    {m.body}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
            placeholder="Reply to buyer or ask for clarification…"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <button
            onClick={sendMessage}
            disabled={messageSending || !messageInput.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-violet-500"
          >
            {messageSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </section>

      {/* ── Document guide & Upload area (Sellers & Administrators only) ── */}
      {data?.viewer?.role !== 'BUYER' && (
        <>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-zinc-200">
                What to upload — {requiredGuides.length} document type{requiredGuides.length !== 1 ? 's' : ''} required
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Each card below is an example of the document format. Make sure every highlighted field is
                clearly readable — the AI will verify each one against the contract.
              </p>
            </div>

            <div
              className={`grid gap-4 ${
                requiredGuides.length === 1
                  ? 'max-w-sm'
                  : requiredGuides.length === 2
                  ? 'sm:grid-cols-2'
                  : 'sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {requiredGuides.map((guide) => (
                <DocGuideCard key={guide.key} guide={guide} />
              ))}
            </div>
          </section>

          {/* ── Upload area ── */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-sm font-semibold text-zinc-200">Upload evidence files</h2>

            {tx.status === 'VERIFICATION_FAILED' && (
              <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Verification failed. Upload corrected, clearer evidence to request a fresh review; the transaction will return to verification pending.</p>
            )}

            {canUpload ? (
              <>
                {/* ── Live Demo Document Suite ── */}
                <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-semibold text-zinc-200">
                        Live Demonstration Document Suite (.jpg)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setDemoSetTab('set2')}
                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                          demoSetTab === 'set2'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Set 2: New Demo Suite (8 .jpg)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDemoSetTab('set1')}
                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                          demoSetTab === 'set1'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Set 1: Baseline (5 .jpg)
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(demoSetTab === 'set2' ? DEMO_FIXTURES_SET_2 : DEMO_FIXTURES_SET_1).map((fixture) => (
                      <div
                        key={fixture.file}
                        className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-xs transition-colors hover:border-zinc-700"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-zinc-200">{fixture.label}</p>
                          <p className="truncate text-[11px] text-zinc-500">{fixture.desc}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <a
                            href={`/demo-docs/${fixture.file}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Preview full document in new tab"
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            disabled={uploading}
                            onClick={() => void attachDemoFile(fixture.file)}
                            className="inline-flex items-center gap-1 rounded bg-blue-600/20 px-2 py-1 text-[11px] font-medium text-blue-300 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                          >
                            <FilePlus2 className="h-3 w-3" />
                            Attach
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[11px] text-zinc-500">
                    💡 Click <strong>Attach</strong> to instantly stage any document for live demo verification, or click the link icon to inspect/download the full resolution image.
                  </p>
                </div>

                <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 px-6 py-10 text-center transition-colors hover:bg-blue-500/10">
                  <UploadCloud className="mb-3 h-8 w-8 text-blue-400" />
                  <span className="text-sm font-medium text-zinc-200">Click to select files</span>
                  <span className="mt-1.5 text-xs text-zinc-500">
                    Images (JPG, PNG), PDF, or .txt demo fixtures · Max 10 MB per file
                  </span>
                  <span className="mt-3 flex flex-wrap justify-center gap-2">
                    {requiredGuides.map((g) => {
                      const Icon = g.icon;
                      return (
                        <span
                          key={g.key}
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-400"
                        >
                          <Icon className="h-3 w-3" />
                          {g.label}
                        </span>
                      );
                    })}
                  </span>
                  <input
                    className="sr-only"
                    type="file"
                    multiple
                    accept="image/*,application/pdf,text/plain"
                    onChange={chooseFiles}
                  />
                </label>

                {files.length > 0 && (
                  <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="mb-2 text-xs font-medium text-zinc-400">
                      {files.length} file{files.length > 1 ? 's' : ''} ready to upload
                    </p>
                    <ul className="mb-3 space-y-1.5">
                      {files.map((f, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2 text-zinc-300">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                            <span className="truncate">{f.name}</span>
                          </span>
                          <span className="shrink-0 text-xs text-zinc-600">
                            {(f.size / 1024).toFixed(0)} KB
                          </span>
                        </li>
                      ))}
                    </ul>

                    <label className="mb-3 flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allowDuplicateMode}
                        onChange={(e) => setAllowDuplicateMode(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Allow reusing same document across transactions (Demo/Override)</span>
                    </label>

                    <button
                      disabled={uploading}
                      onClick={() => void upload(allowDuplicateMode)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4" />
                          Upload {files.length} file{files.length > 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-300">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <div className="flex-1">
                        <p>{error}</p>
                        {(error.toLowerCase().includes('already been') || error.toLowerCase().includes('duplicate')) && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                            {files.length > 0 ? (
                              <button
                                type="button"
                                disabled={uploading}
                                onClick={() => void upload(true)}
                                className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition-colors disabled:opacity-60"
                              >
                                {uploading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UploadCloud className="h-3.5 w-3.5" />
                                )}
                                Upload anyway (Allow duplicate)
                              </button>
                            ) : (
                              <span className="text-xs text-amber-300/90">
                                Select the file again and check &ldquo;Allow reusing same document&rdquo; to proceed.
                              </span>
                            )}
                            <span className="text-[11px] text-zinc-400">
                              Bypasses anti-replay duplicate guard for demo or testing.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {notice && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {notice}
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-500">
                Evidence uploads are closed for this order&apos;s current status ({tx.status}).
              </p>
            )}
          </section>
        </>
      )}

      {/* ── Uploaded evidence list ── */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">
          Uploaded evidence
          <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-normal text-zinc-400">
            {data.documents.length}
          </span>
        </h2>

        {data.documents.length ? (
          <div className="space-y-3">
            {data.documents.map((doc) =>
              doc.isShredded ? (
                <ShreddedDocumentCard
                  key={doc.id}
                  document={{
                    id: doc.id,
                    fileName: doc.fileName,
                    fileType: doc.fileType || 'application/pdf',
                    fileSize: doc.fileSize,
                    sha256: doc.fileHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                    dekKeyId: doc.dekKeyId,
                    uploadedAt: doc.uploadedAt,
                    isShredded: true,
                    shreddedAt: doc.shreddedAt || doc.uploadedAt,
                    shreddedReason: doc.shreddedReason || 'Right to be Forgotten (DPDP/GDPR) erasure request executed',
                  }}
                />
              ) : (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-950/60 px-3 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-zinc-300">
                    <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                    <span className="truncate">{doc.fileName}</span>
                    <span className="shrink-0 text-xs text-zinc-600">
                      · {(doc.fileSize / 1024).toFixed(0)} KB
                    </span>
                  </span>
                  <span className="ml-4 flex shrink-0 items-center gap-1 text-xs text-zinc-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {formatDate(doc.uploadedAt)}
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No evidence has been uploaded yet.</p>
        )}
      </section>

      {/* ── Typed Confirmation for Refund Request ── */}
      <TypedConfirmationDialog
        open={refundModalOpen}
        onOpenChange={setRefundModalOpen}
        title="Release Reserved Funds Back to Buyer?"
        description="This will acknowledge that the order cannot be delivered and will authorize release of the buyer's reserved escrow deposit."
        requiredKeyword="REFUND"
        requireReason={true}
        reasonPlaceholder="State the fulfillment reason for initiating refund…"
        confirmLabel="Confirm Escrow Refund"
        isDestructive={true}
        onReasonChange={setRefundReason}
        onConfirm={async () => {
          await requestRefund();
          setRefundModalOpen(false);
        }}
      />

      <button
        onClick={() => router.back()}
        className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
      >
        ← Back to dashboard
      </button>
    </div>
  );
}
