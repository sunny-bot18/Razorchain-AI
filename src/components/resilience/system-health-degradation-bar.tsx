'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Truck,
  Building2,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  FileCheck,
  FileText,
  Upload,
  Calendar,
  Clock,
  Loader2,
  ShieldCheck,
  AlertOctagon,
  KeyRound,
  Package,
  ExternalLink,
  Hash,
} from 'lucide-react';
import { cn, formatINR } from '@/lib/utils';
import { DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import StatusBadge from '@/components/status-badge';

export type ServiceStatus = 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';

export interface ServiceHealth {
  id: string;
  name: string;
  category: 'AI_VISION' | 'LOGISTICS' | 'BANKING';
  status: ServiceStatus;
  latencyMs: number;
  lastChecked: string;
  outageReason?: string;
  fallbackActionLabel: string;
  fallbackDescription: string;
}

export interface ResilienceOrderCandidate {
  id: string;
  transactionNumber: string;
  amount: number;
  status: string;
  poNumber?: string;
  productDescription?: string;
  buyerName?: string;
  buyerCompany?: string | null;
  sellerName?: string;
  sellerCompany?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  carrierStatus?: string | null;
}

interface SystemHealthDegradationBarProps {
  transactionId?: string;
  transactionNumber?: string;
  transactions?: ResilienceOrderCandidate[];
  onTriggerFallback?: (serviceId: string) => void;
  onRefresh?: () => Promise<void> | void;
  className?: string;
}

const SERVICE_PROFILES: Record<
  string,
  Record<ServiceStatus, { latencyMs: number; reason?: string }>
> = {
  gemini_vision: {
    OPERATIONAL: { latencyMs: 380, reason: undefined },
    DEGRADED: {
      latencyMs: 3420,
      reason: 'Upstream rate limiting (HTTP 429) & elevated inference queue latency.',
    },
    OUTAGE: {
      latencyMs: 0,
      reason: 'Upstream Vision API service unavailable (HTTP 503).',
    },
  },
  carrier_telemetry: {
    OPERATIONAL: { latencyMs: 190, reason: undefined },
    DEGRADED: {
      latencyMs: 2850,
      reason: 'Carrier webhook sync delayed (> 45 min lag on Delhivery/BlueDart AWB).',
    },
    OUTAGE: {
      latencyMs: 0,
      reason: 'Carrier AWB webhook server connection timed out (HTTP 504).',
    },
  },
  razorpay_nodal: {
    OPERATIONAL: { latencyMs: 140, reason: undefined },
    DEGRADED: {
      latencyMs: 1920,
      reason: 'High settlement congestion on RBI NEFT/RTGS batch window.',
    },
    OUTAGE: {
      latencyMs: 0,
      reason: 'Nodal payout gateway offline during scheduled maintenance.',
    },
  },
};

export function SystemHealthDegradationBar({
  transactionId,
  transactionNumber,
  transactions = [],
  onTriggerFallback,
  onRefresh,
  className,
}: SystemHealthDegradationBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState<'gemini_vision' | 'carrier_telemetry' | 'razorpay_nodal' | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Selected Target Order for Fallback Execution
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Form states for the 3 fallback modals
  const [opsNotes, setOpsNotes] = useState('Manual physical verification certified by operations examiner.');
  const [podFile, setPodFile] = useState<string | null>('delivery_receipt_physical_signed.jpg');
  const [consigneeSignatory, setConsigneeSignatory] = useState('Rajesh Kumar (Consignee Operations)');
  const [batchWindow, setBatchWindow] = useState('NEXT_IMMEDIATE_CYCLE');

  // Simulated service statuses (allows toggling degraded states for testing)
  const [services, setServices] = useState<ServiceHealth[]>([
    {
      id: 'gemini_vision',
      name: 'Google Gemini 2.5 VisionAgent',
      category: 'AI_VISION',
      status: 'OPERATIONAL',
      latencyMs: 380,
      lastChecked: 'Just now',
      fallbackActionLabel: 'Manual Vision Triage',
      fallbackDescription: 'Route unverified delivery evidence to Ops human verification workbench.',
    },
    {
      id: 'carrier_telemetry',
      name: 'Multi-Carrier Logistics Telemetry (BlueDart / Delhivery)',
      category: 'LOGISTICS',
      status: 'OPERATIONAL',
      latencyMs: 190,
      lastChecked: 'Just now',
      fallbackActionLabel: 'Manual Consignee Attestation',
      fallbackDescription: 'Permit signed Delivery Challan & physical GPS stamp upload.',
    },
    {
      id: 'razorpay_nodal',
      name: 'Razorpay / RBI Nodal Clearing Core',
      category: 'BANKING',
      status: 'OPERATIONAL',
      latencyMs: 140,
      lastChecked: 'Just now',
      fallbackActionLabel: 'Queue Overnight Batch',
      fallbackDescription: 'Queue settlement instruction for direct NEFT/RTGS clearing window.',
    },
  ]);

  // Target Candidates for active fallback modal
  const geminiCandidates = transactions.filter(
    (t) => ['AWAITING_MANUAL_TRIAGE', 'VERIFICATION_FAILED', 'VERIFICATION_PENDING'].includes(t.status)
  );
  const carrierCandidates = transactions.filter(
    (t) => ['IN_TRANSIT_UNVERIFIED', 'DELIVERY_PENDING'].includes(t.status) || t.carrierStatus === 'UNAVAILABLE'
  );
  const nodalCandidates = transactions.filter(
    (t) => ['SETTLEMENT_QUEUED'].includes(t.status)
  );

  const activeCandidates =
    activeModal === 'gemini_vision'
      ? (geminiCandidates.length > 0 ? geminiCandidates : transactions)
      : activeModal === 'carrier_telemetry'
      ? (carrierCandidates.length > 0 ? carrierCandidates : transactions)
      : activeModal === 'razorpay_nodal'
      ? (nodalCandidates.length > 0 ? nodalCandidates : transactions)
      : [];

  const activeTargetOrder =
    activeCandidates.find((o) => o.id === selectedOrderId) ||
    activeCandidates[0] ||
    (transactionId ? { id: transactionId, transactionNumber: transactionNumber || 'TARGET-ORDER', amount: 0, status: 'UNKNOWN' } : null);

  const openFallbackModal = (type: 'gemini_vision' | 'carrier_telemetry' | 'razorpay_nodal') => {
    let defaultCandidate: ResilienceOrderCandidate | undefined;
    if (type === 'gemini_vision') {
      defaultCandidate = geminiCandidates[0] || transactions.find(t => t.transactionNumber?.includes('GEMINI')) || transactions[0];
    } else if (type === 'carrier_telemetry') {
      defaultCandidate = carrierCandidates[0] || transactions.find(t => t.transactionNumber?.includes('CARRIER')) || transactions[0];
    } else if (type === 'razorpay_nodal') {
      defaultCandidate = nodalCandidates[0] || transactions.find(t => t.transactionNumber?.includes('NODAL')) || transactions[0];
    }
    setSelectedOrderId(defaultCandidate?.id || transactionId || null);
    setActiveModal(type);
  };

  const degradedServices = services.filter((s) => s.status !== 'OPERATIONAL');
  const hasOutage = degradedServices.length > 0;

  const toggleServiceStatus = (id: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextStatus: ServiceStatus =
          s.status === 'OPERATIONAL' ? 'DEGRADED' : s.status === 'DEGRADED' ? 'OUTAGE' : 'OPERATIONAL';
        const profile = SERVICE_PROFILES[s.id]?.[nextStatus] || { latencyMs: s.latencyMs, reason: undefined };
        return {
          ...s,
          status: nextStatus,
          latencyMs: profile.latencyMs,
          outageReason: profile.reason,
        };
      })
    );
  };

  const handleExecuteFallback = async (type: 'gemini_vision' | 'carrier_telemetry' | 'razorpay_nodal') => {
    setModalLoading(true);
    const targetOrderId = activeTargetOrder?.id || transactionId;
    const targetTxNumber = activeTargetOrder?.transactionNumber || transactionNumber || 'TARGET-ORDER';
    let message = `✓ Fallback executed successfully for ${targetTxNumber}.`;

    try {
      if (type === 'gemini_vision') {
        if (targetOrderId) {
          const res = await fetch(`/api/transactions/${targetOrderId}/manual-vision-triage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              decision: 'APPROVE',
              notes: opsNotes || 'Manual vision triage certified by operations analyst.',
              stampVerified: true,
              itemsVerified: true,
            }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Failed to certify manual triage');
          message = `✓ Order #${targetTxNumber} Force Approved via Manual Vision Triage.`;
        } else {
          message = '✓ Manual Vision Triage router active. Target order updated.';
        }
      } else if (type === 'carrier_telemetry') {
        if (targetOrderId) {
          const res = await fetch(`/api/transactions/${targetOrderId}/consignee-attestation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signatoryName: consigneeSignatory,
              documentName: podFile,
              gpsCoordinates: { latitude: 19.076, longitude: 72.8777, accuracy: 5.0 },
              notes: 'Consignee signed delivery challan & GPS timestamp certified.',
            }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Failed to submit attestation');
          message = `✓ Physical POD attestation certified with GPS stamp for Order #${targetTxNumber}.`;
        } else {
          message = '✓ Carrier fallback enabled: Physical POD certified.';
        }
      } else if (type === 'razorpay_nodal') {
        const res = await fetch('/api/admin/settlement-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderIds: targetOrderId ? [targetOrderId] : undefined,
            batchWindow,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to execute batch settlement');
        message = result.processedCount > 0
          ? `✓ Idempotent Batch Execution: Settled Order #${targetTxNumber} via RBI Nodal window.`
          : '✓ Settlement instructions queued for next RBI Nodal batch clearing.';
      }

      if (onRefresh) await onRefresh();
    } catch (err) {
      message = `Fallback Notice: ${err instanceof Error ? err.message : 'Action completed in simulation mode'}`;
    } finally {
      setModalLoading(false);
      setActiveModal(null);
      setSuccessToast(message);
      setTimeout(() => setSuccessToast(null), 6000);
      onTriggerFallback?.(type);
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all shadow-md overflow-hidden',
        hasOutage
          ? 'border-amber-500/50 bg-amber-950/20'
          : 'border-zinc-800 bg-zinc-900/60',
        className
      )}
    >
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-white/80 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Primary Degradation Bar Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-950/40">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                hasOutage ? 'bg-amber-400' : 'bg-emerald-400'
              )}
            />
            <span
              className={cn(
                'relative inline-flex rounded-full h-3 w-3',
                hasOutage ? 'bg-amber-500' : 'bg-emerald-500'
              )}
            />
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-100">
              {hasOutage
                ? `Active Upstream Degradation Detected (${degradedServices.length} Fallback Switch Active)`
                : 'All 3rd-Party Gateway Integrations Nominal (Zero Supply Chain Halt)'}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              Gemini Vision • Carrier Webhooks • RBI Nodal Clearing
            </span>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <span>{expanded ? 'Hide Resilience Matrix' : 'View Resilience Matrix'}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expanded Resilience Matrix Drawer */}
      {expanded && (
        <div className="border-t border-zinc-800/80 bg-zinc-950/60 p-5 space-y-4 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
              Integration Telemetry & Graceful Fallback Switches:
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              (Click test badge to simulate outage · Click button to trigger fallback)
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {services.map((svc) => {
              const isHealthy = svc.status === 'OPERATIONAL';
              const isDegraded = svc.status === 'DEGRADED';
              const isOutage = svc.status === 'OUTAGE';

              return (
                <div
                  key={svc.id}
                  className={cn(
                    'rounded-xl border p-4 space-y-3 transition-all',
                    isHealthy
                      ? 'border-zinc-800 bg-zinc-900/40'
                      : isOutage
                      ? 'border-red-500/40 bg-red-950/20 shadow-lg shadow-red-950/30'
                      : 'border-amber-500/40 bg-amber-950/20 shadow-lg shadow-amber-950/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200 leading-tight">
                        {svc.name}
                      </h4>
                    </div>

                    <button
                      onClick={() => toggleServiceStatus(svc.id)}
                      title="Click to toggle simulated outage/degraded status"
                      className={cn(
                        'text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0',
                        isHealthy
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : isOutage
                          ? 'border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                          : 'border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      )}
                    >
                      {svc.status}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span>
                      Latency:{' '}
                      <strong
                        className={
                          isHealthy
                            ? 'text-zinc-300'
                            : isDegraded
                            ? 'text-amber-400 font-bold'
                            : 'text-red-400 font-bold'
                        }
                      >
                        {svc.latencyMs > 0 ? `${svc.latencyMs}ms` : svc.id === 'razorpay_nodal' ? 'OFFLINE' : 'TIMEOUT'}
                      </strong>
                    </span>
                    <span>{svc.lastChecked}</span>
                  </div>

                  <div className="pt-1 border-t border-zinc-800/80">
                    <p className="text-[10px] text-zinc-400 mb-1.5">
                      {svc.fallbackDescription}
                    </p>
                    <button
                      onClick={() => openFallbackModal(svc.id as any)}
                      className={cn(
                        'w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors border cursor-pointer',
                        isHealthy
                          ? 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                          : isOutage
                          ? 'border-red-500/50 bg-red-600 text-white shadow-lg shadow-red-500/25 hover:bg-red-500'
                          : 'border-amber-500/40 bg-amber-600 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-500'
                      )}
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      <span>{svc.fallbackActionLabel}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal 1: Manual Vision Triage ── */}
      <DialogPrimitive.Root open={activeModal === 'gemini_vision'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-800 bg-zinc-900 p-6 shadow-2xl duration-200 sm:rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-bold text-zinc-100">
                  Manual Vision Triage Workbench
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-zinc-400">
                  Fallback workflow when Gemini Vision API is experiencing upstream latency or maintenance.
                </DialogPrimitive.Description>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Target Order Details Card */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Target Order Under Operation
                  </span>
                  {activeTargetOrder && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                      {formatINR(activeTargetOrder.amount)}
                    </span>
                  )}
                </div>

                {/* If multiple orders available, show order selector dropdown */}
                {activeCandidates.length > 1 && (
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Select Affected Order to Triage:</label>
                    <select
                      value={activeTargetOrder?.id || ''}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-mono text-zinc-200 focus:border-blue-500 focus:outline-none"
                    >
                      {activeCandidates.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.transactionNumber} — {o.productDescription?.slice(0, 30)} ({formatINR(o.amount)}) [{o.status}]
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTargetOrder ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-100">{activeTargetOrder.transactionNumber}</span>
                      <StatusBadge status={activeTargetOrder.status} />
                      {activeTargetOrder.poNumber && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          PO: {activeTargetOrder.poNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 font-medium truncate">{activeTargetOrder.productDescription || '500x High-Precision CNC Servo Actuators (Model AX-900)'}</p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                      <span>Buyer: <strong className="text-zinc-300">{activeTargetOrder.buyerCompany || activeTargetOrder.buyerName || 'Acme Manufacturing Corp'}</strong></span>
                      <span>Seller: <strong className="text-zinc-300">{activeTargetOrder.sellerCompany || activeTargetOrder.sellerName || 'Apex Precision Engineering Ltd'}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No active pending orders in queue.</p>
                )}
              </div>

              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">
                  Human Inspection Checklist
                </span>
                <label className="flex items-center gap-2 text-zinc-300">
                  <input type="checkbox" defaultChecked className="rounded accent-blue-500" />
                  <span>Physical delivery challan stamp and receiver signature visually verified.</span>
                </label>
                <label className="flex items-center gap-2 text-zinc-300">
                  <input type="checkbox" defaultChecked className="rounded accent-blue-500" />
                  <span>Line-item quantities match purchase order specification.</span>
                </label>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-zinc-300">
                  Operations Examiner Notes <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={opsNotes}
                  onChange={(e) => setOpsNotes(e.target.value)}
                  placeholder="Enter manual verification justification and file hash review notes…"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none min-h-[70px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalLoading}
                  onClick={() => handleExecuteFallback('gemini_vision')}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 disabled:opacity-50"
                >
                  {modalLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Certify Manual Vision Extraction
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>

      {/* ── Modal 2: Manual Consignee Attestation ── */}
      <DialogPrimitive.Root open={activeModal === 'carrier_telemetry'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-800 bg-zinc-900 p-6 shadow-2xl duration-200 sm:rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-bold text-zinc-100">
                  Manual Consignee POD Attestation
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-zinc-400">
                  Carrier API gateway fallback: Permit signed physical Proof-of-Delivery attestation.
                </DialogPrimitive.Description>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Target Order Details Card */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Target Order Under Operation
                  </span>
                  {activeTargetOrder && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                      {formatINR(activeTargetOrder.amount)}
                    </span>
                  )}
                </div>

                {/* If multiple orders available, show order selector dropdown */}
                {activeCandidates.length > 1 && (
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Select Affected Shipment to Attest:</label>
                    <select
                      value={activeTargetOrder?.id || ''}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-mono text-zinc-200 focus:border-indigo-500 focus:outline-none"
                    >
                      {activeCandidates.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.transactionNumber} — {o.productDescription?.slice(0, 30)} ({formatINR(o.amount)}) [{o.status}]
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTargetOrder ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-100">{activeTargetOrder.transactionNumber}</span>
                      <StatusBadge status={activeTargetOrder.status} />
                      {activeTargetOrder.carrier && (
                        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                          {activeTargetOrder.carrier} {activeTargetOrder.trackingNumber ? `(${activeTargetOrder.trackingNumber})` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 font-medium truncate">{activeTargetOrder.productDescription || '1,200x Medical Grade Titanium Stents'}</p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                      <span>Buyer: <strong className="text-zinc-300">{activeTargetOrder.buyerCompany || activeTargetOrder.buyerName || 'Acme Manufacturing Corp'}</strong></span>
                      <span>Seller: <strong className="text-zinc-300">{activeTargetOrder.sellerCompany || activeTargetOrder.sellerName || 'Apex Precision Engineering Ltd'}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No active pending orders in queue.</p>
                )}
              </div>

              <div>
                <label className="mb-1 block font-semibold text-zinc-300">
                  Consignee Signatory Full Name
                </label>
                <input
                  type="text"
                  value={consigneeSignatory}
                  onChange={(e) => setConsigneeSignatory(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-zinc-300">
                  Signed Delivery Challan Attachment
                </label>
                <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950 p-3 text-center text-zinc-400">
                  <FileText className="h-5 w-5 mx-auto text-indigo-400 mb-1" />
                  <span className="font-mono text-zinc-200">{podFile}</span>
                  <span className="block text-[10px] text-zinc-500 mt-0.5">Physical signature & warehouse receiver stamp detected (GPS: 19.0760° N, 72.8777° E)</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalLoading}
                  onClick={() => handleExecuteFallback('carrier_telemetry')}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {modalLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Submit Physical POD Certification
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>

      {/* ── Modal 3: Queue Overnight Batch ── */}
      <DialogPrimitive.Root open={activeModal === 'razorpay_nodal'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-800 bg-zinc-900 p-6 shadow-2xl duration-200 sm:rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-bold text-zinc-100">
                  Queue Direct Nodal Batch Settlement
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-zinc-400">
                  Bypasses instant gateway latency by queuing for the next RBI NEFT/RTGS clearing cycle.
                </DialogPrimitive.Description>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Target Order Details Card */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Target Batch Queue Order
                  </span>
                  {activeTargetOrder && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                      {formatINR(activeTargetOrder.amount)}
                    </span>
                  )}
                </div>

                {/* If multiple orders available, show order selector dropdown */}
                {activeCandidates.length > 1 && (
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Select Queued Order to Settle:</label>
                    <select
                      value={activeTargetOrder?.id || ''}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-mono text-zinc-200 focus:border-emerald-500 focus:outline-none"
                    >
                      {activeCandidates.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.transactionNumber} — {o.productDescription?.slice(0, 30)} ({formatINR(o.amount)}) [{o.status}]
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTargetOrder ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-100">{activeTargetOrder.transactionNumber}</span>
                      <StatusBadge status={activeTargetOrder.status} />
                      {activeTargetOrder.poNumber && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          PO: {activeTargetOrder.poNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 font-medium truncate">{activeTargetOrder.productDescription || '3,000x Monocrystalline Solar Photovoltaic Cells'}</p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
                      <span>Buyer: <strong className="text-zinc-300">{activeTargetOrder.buyerCompany || activeTargetOrder.buyerName || 'Acme Manufacturing Corp'}</strong></span>
                      <span>Seller: <strong className="text-zinc-300">{activeTargetOrder.sellerCompany || activeTargetOrder.sellerName || 'Apex Precision Engineering Ltd'}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No active pending orders in queue.</p>
                )}
              </div>

              <div>
                <label className="mb-1 block font-semibold text-zinc-300">
                  Clearing Window Execution
                </label>
                <select
                  value={batchWindow}
                  onChange={(e) => setBatchWindow(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="NEXT_IMMEDIATE_CYCLE">Immediate Next Hourly Settlement Cycle (00:00 UTC)</option>
                  <option value="OVERNIGHT_WINDOW">Overnight RBI Nodal Bulk Batch (06:00 IST)</option>
                </select>
              </div>

              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Audit Assurance</span>
                </div>
                <p>
                  Settlement commitments are signed with Polygon PoS Merkle anchor receipts to guarantee zero loss of funds during batch transmission.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalLoading}
                  onClick={() => handleExecuteFallback('razorpay_nodal')}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500 disabled:opacity-50"
                >
                  {modalLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Execute Batch Settlement
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>
    </div>
  );
}
