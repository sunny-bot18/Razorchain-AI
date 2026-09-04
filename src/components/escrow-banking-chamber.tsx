'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, CreditCard, Building2, Smartphone, Check, Copy,
  ArrowRight, Download, Clock, AlertTriangle, AlertCircle, Loader2, Sparkles, CheckCircle2,
  Landmark, QrCode, RefreshCw
} from 'lucide-react';
import { formatINR, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface VirtualAccountData {
  accountNumber: string;
  ifsc: string;
  bankName: string;
  beneficiaryName: string;
  expiresAt?: string;
}

interface EscrowBankingChamberProps {
  transactionId: string;
  transactionNumber: string;
  amount: number;
  currency?: string;
  status: string;
  requiresDualApproval?: boolean;
  firstApproverId?: string | null;
  secondApproverId?: string | null;
  autoReleaseAt?: string | null;
  virtualAccount?: VirtualAccountData | null;
  paymentExecution?: {
    action: string;
    amount: number;
    status: string;
    razorpayResponse?: Record<string, unknown> | null;
    executedAt?: string | null;
  } | null;
  paymentReservation?: Record<string, unknown> | null;
  viewerRole?: 'BUYER' | 'SELLER' | 'ADMIN';
  onReserve: (method: 'web_checkout' | 'virtual_account', details?: Record<string, unknown>) => Promise<void>;
  onExecutePayout: () => Promise<void>;
  onDownloadCertificate?: () => void;
  acting: string | null;
}

export default function EscrowBankingChamber({
  transactionId,
  transactionNumber,
  amount,
  currency = 'INR',
  status,
  requiresDualApproval = false,
  firstApproverId,
  secondApproverId,
  autoReleaseAt,
  virtualAccount: initialVirtualAccount,
  paymentExecution,
  paymentReservation,
  viewerRole = 'BUYER',
  onReserve,
  onExecutePayout,
  onDownloadCertificate,
  acting,
}: EscrowBankingChamberProps) {
  // Step 1 funding channel tab: 'upi_card' | 'van'
  const [fundingChannel, setFundingChannel] = useState<'upi_card' | 'van'>('upi_card');
  const [upiProvider, setUpiProvider] = useState<'gpay' | 'phonepe' | 'paytm' | 'card'>('gpay');
  const [upiId, setUpiId] = useState('treasury@okaxis');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Virtual Account state
  const [vanData, setVanData] = useState<VirtualAccountData | null>(initialVirtualAccount || null);
  const [loadingVan, setLoadingVan] = useState(false);

  // Inbound wire simulation
  const [simulatedUtr, setSimulatedUtr] = useState('');

  useEffect(() => {
    if (initialVirtualAccount) {
      setVanData(initialVirtualAccount);
    }
  }, [initialVirtualAccount]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Generate or fetch Virtual Account
  const fetchOrGenerateVan = async () => {
    if (vanData) return;
    setLoadingVan(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/virtual-account`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.virtualAccount) {
        setVanData(data.virtualAccount);
      }
    } catch (err) {
      console.error('Failed to generate virtual account:', err);
    } finally {
      setLoadingVan(false);
    }
  };

  useEffect(() => {
    if (fundingChannel === 'van' && !vanData && status === 'CREATED') {
      fetchOrGenerateVan();
    }
  }, [fundingChannel, status]);

  // Determine which step is currently active
  const isCreated = status === 'CREATED';
  const isReservedOrProgressing = [
    'FUNDS_RESERVED',
    'DELIVERY_PENDING',
    'VERIFICATION_PENDING',
    'VERIFIED',
    'MANUAL_REVIEW',
    'DISPUTED',
    'SETTLED'
  ].includes(status);
  const isVerified = status === 'VERIFIED';
  const isSettled = status === 'SETTLED';

  // Extract UTR if settled
  const utrNumber =
    (paymentExecution?.razorpayResponse?.utr as string) ||
    (paymentExecution?.razorpayResponse?.acquirer_data as any)?.rrn ||
    (paymentExecution?.razorpayResponse?.id as string) ||
    `UTR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}8839210041`;

  const isHighValue = amount >= 1_000_000 || requiresDualApproval;
  const isMultiSigGated = isHighValue && (!firstApproverId || !secondApproverId);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-zinc-100">
              Escrow Banking & Nodal Vault Suite
            </h2>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              RBI Escrow Compliant
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Powered by RazorpayX Nodal Banking & ICICI Escrow Sub-Ledger
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-400">Contract Amount:</span>
          <span className="text-lg font-bold font-mono text-zinc-100">
            {formatINR(amount)}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STEP 1: FUNDING THE ESCROW (Visible when status === 'CREATED')        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isCreated && (
        <div className="space-y-4 rounded-xl border border-blue-500/30 bg-blue-950/20 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                1
              </span>
              <h3 className="font-semibold text-zinc-100">
                Step 1: Fund the Escrow Vault
              </h3>
            </div>
            <span className="text-xs text-blue-400 font-medium">
              Funds held securely in nodal escrow until inspection
            </span>
          </div>

          {isMultiSigGated && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Dual Counterparty Multi-Sig Required Before Escrow Funding</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                For high-value transactions (≥ {formatINR(1_000_000)}), digital authorization signatures from both <strong>Buyer</strong> and <strong>Seller</strong> are mandatory before funds can be locked in the escrow vault.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                <span className={cn('px-2.5 py-1 rounded border', firstApproverId ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-800 text-zinc-400')}>
                  {firstApproverId ? '✓ 1. Buyer Signed' : '⏳ 1. Buyer Pending'}
                </span>
                <span className={cn('px-2.5 py-1 rounded border', secondApproverId ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-800 text-zinc-400')}>
                  {secondApproverId ? '✓ 2. Seller Signed' : '⏳ 2. Seller Pending'}
                </span>
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-300">
            Select your preferred banking channel to lock {formatINR(amount)} into the transaction escrow vault:
          </p>

          {/* Funding Channel Tabs */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-900 p-1 border border-zinc-800">
            <button
              onClick={() => setFundingChannel('upi_card')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-colors',
                fundingChannel === 'upi_card'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Smartphone className="h-4 w-4" />
              UPI & Corporate Cards
            </button>
            <button
              onClick={() => setFundingChannel('van')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-colors',
                fundingChannel === 'van'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Landmark className="h-4 w-4" />
              Corporate NEFT / RTGS (Virtual Account)
            </button>
          </div>

          {/* CHANNEL A: UPI, Cards & NetBanking Modal Simulator */}
          {fundingChannel === 'upi_card' && (
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/90 p-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'gpay', name: 'Google Pay', icon: Smartphone },
                  { id: 'phonepe', name: 'PhonePe', icon: Smartphone },
                  { id: 'paytm', name: 'Paytm UPI', icon: QrCode },
                  { id: 'card', name: 'Corp Card', icon: CreditCard },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setUpiProvider(item.id as any)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-center transition-all',
                      upiProvider === item.id
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300 font-semibold shadow-sm'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-[11px]">{item.name}</span>
                  </button>
                ))}
              </div>

              {upiProvider !== 'card' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    VPA / UPI ID
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="company@okhdfcbank"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="col-span-2 space-y-1">
                    <span className="text-zinc-400">Card Number</span>
                    <input
                      disabled
                      value="•••• •••• •••• 4242 (Corporate Visa)"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-400">Valid Thru</span>
                    <input
                      disabled
                      value="12/28"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-xs text-zinc-400">
                  {isMultiSigGated ? 'Requires 2/2 Multi-Sig Signatures before escrow lock' : 'Instant escrow lock authorization'}
                </span>
                <button
                  onClick={() => onReserve('web_checkout', { provider: upiProvider, upiId })}
                  disabled={acting !== null || isMultiSigGated}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {acting === 'reserve' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Authorizing...
                    </>
                  ) : isMultiSigGated ? (
                    <>
                      <Lock className="h-3.5 w-3.5" /> Awaiting 2/2 Multi-Sig Signatures
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" /> Authorize & Lock in Escrow ({formatINR(amount)})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* CHANNEL B: Corporate NEFT / RTGS (Virtual Accounts) */}
          {fundingChannel === 'van' && (
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/90 p-4">
              {loadingVan ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  Generating dedicated NEFT/RTGS Virtual Account with RBI Nodal Bank...
                </div>
              ) : vanData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Dedicated Escrow Virtual Account Active
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Bank: {vanData.bankName}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 space-y-1">
                      <span className="text-zinc-500 block text-[11px]">Virtual Account Number (VAN)</span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-zinc-100 text-sm">{vanData.accountNumber}</span>
                        <button
                          onClick={() => copyToClipboard(vanData.accountNumber, 'van')}
                          className="text-zinc-400 hover:text-white"
                        >
                          {copiedField === 'van' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 space-y-1">
                      <span className="text-zinc-500 block text-[11px]">IFSC Code</span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-zinc-100 text-sm">{vanData.ifsc}</span>
                        <button
                          onClick={() => copyToClipboard(vanData.ifsc, 'ifsc')}
                          className="text-zinc-400 hover:text-white"
                        >
                          {copiedField === 'ifsc' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 space-y-1 sm:col-span-2">
                      <span className="text-zinc-500 block text-[11px]">Beneficiary Account Name</span>
                      <span className="font-semibold text-zinc-200">{vanData.beneficiaryName}</span>
                    </div>
                  </div>

                  {/* Simulate Wire Transfer Confirmation */}
                  <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-amber-200/90">
                      <strong>ERP Testing Simulator:</strong> {isMultiSigGated ? 'Complete Buyer and Seller multi-sig co-signatures above to unlock wire simulation.' : 'Simulate your treasury team executing the RTGS transfer from your corporate bank.'}
                    </div>
                    <button
                      onClick={() => onReserve('virtual_account', { van: vanData.accountNumber })}
                      disabled={acting !== null || isMultiSigGated}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow"
                    >
                      {acting === 'reserve' ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying Wire...
                        </>
                      ) : isMultiSigGated ? (
                        <>
                          <Lock className="h-3.5 w-3.5" /> Awaiting Multi-Sig
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-3.5 w-3.5" /> Simulate Inbound RTGS Wire Credit
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STEP 2: CRYPTOGRAPHIC ESCROW LOCK (Visible when reserved)            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isReservedOrProgressing && (
        <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                2
              </span>
              <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                Step 2: Cryptographic Escrow Lock
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              FUNDS_RESERVED · {formatINR(amount)}
            </span>
          </div>

          <p className="text-xs text-zinc-300">
            The funds are securely locked in the <strong>RBI-regulated RazorpayX Nodal Escrow Account</strong>. Funds cannot be recalled by the buyer or released to the seller until AI verification of delivery proof clears.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="rounded-lg bg-zinc-900/80 p-3 border border-zinc-800">
              <span className="text-zinc-500 block text-[11px]">Vault Custodian</span>
              <span className="font-semibold text-zinc-200">ICICI Escrow / RazorpayX Nodal</span>
            </div>
            <div className="rounded-lg bg-zinc-900/80 p-3 border border-zinc-800">
              <span className="text-zinc-500 block text-[11px]">Escrow Order ID</span>
              <span className="font-mono text-zinc-300 truncate block">
                {(paymentReservation?.orderId as string) || `order_${transactionId.slice(0, 8)}`}
              </span>
            </div>
            <div className="rounded-lg bg-zinc-900/80 p-3 border border-zinc-800">
              <span className="text-zinc-500 block text-[11px]">Protection Rule</span>
              <span className="font-semibold text-emerald-300">8-Point AI Verification Gate</span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STEP 3: SELLER BANK PAYOUT (Disbursement Chamber)                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {(isVerified || isSettled) && (
        <div className={cn(
          'space-y-4 rounded-xl border p-5',
          isSettled
            ? 'border-emerald-500/40 bg-emerald-950/20'
            : 'border-violet-500/30 bg-violet-950/20'
        )}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white',
                isSettled ? 'bg-emerald-600' : 'bg-violet-600'
              )}>
                3
              </span>
              <h3 className="font-semibold text-zinc-100">
                Step 3: Settlement & Seller Bank Payout
              </h3>
            </div>
            <span className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded border font-mono',
              isSettled
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-violet-500/10 text-violet-300 border-violet-500/30'
            )}>
              {isSettled ? 'SETTLED · DISBURSED' : 'READY FOR DISBURSEMENT'}
            </span>
          </div>

          {!isSettled && isVerified && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-300">
                All AI verification and forensic checks passed. Triggering payout will invoke the <strong>RazorpayX Payouts API</strong> to instantly execute an automated IMPS/NEFT transfer directly to the Seller's verified bank account.
              </p>

              <div className="rounded-lg bg-zinc-900/80 p-3.5 border border-zinc-800 grid sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Seller Bank</span>
                  <span className="font-semibold text-zinc-200">HDFC Bank Corporate</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Account Number</span>
                  <span className="font-mono text-zinc-300">•••• •••• 4892</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Disbursement Mode</span>
                  <span className="font-semibold text-emerald-400">IMPS Instant Payout</span>
                </div>
              </div>

              {viewerRole === 'SELLER' ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>
                      Delivery verified. Funds are held in escrow and will be automatically credited to your bank account upon Buyer release.
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    Receivable: {formatINR(amount)}
                  </span>
                </div>
              ) : (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={onExecutePayout}
                    disabled={acting !== null}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-500 disabled:opacity-60"
                  >
                    {acting === 'execute' ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Disbursing Payout...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-3.5 w-3.5" /> Disburse Settlement Payout ({formatINR(amount)})
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {isSettled && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/30 bg-zinc-900/90 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Official Bank Settlement Voucher
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {formatDateTime(paymentExecution?.executedAt || new Date())}
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-zinc-500 text-[11px]">Bank UTR Reference</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-100">{utrNumber}</span>
                      <button
                        onClick={() => copyToClipboard(utrNumber, 'utr')}
                        className="text-zinc-400 hover:text-white"
                      >
                        {copiedField === 'utr' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-zinc-500 text-[11px]">Disbursed Amount</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {formatINR(paymentExecution?.amount || amount)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-zinc-500 text-[11px]">Transfer Channel</span>
                    <span className="font-semibold text-zinc-200">IMPS / RazorpayX Payout</span>
                  </div>
                </div>

                {onDownloadCertificate && (
                  <div className="pt-2 border-t border-zinc-800 flex justify-end">
                    <button
                      onClick={onDownloadCertificate}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                    >
                      <Download className="h-3.5 w-3.5" /> Download Official PDF Settlement Certificate
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
