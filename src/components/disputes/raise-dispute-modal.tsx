'use client';

import React, { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertOctagon, ShieldAlert, Loader2, IndianRupee, HelpCircle } from 'lucide-react';
import { cn, formatINR } from '@/lib/utils';
import { DialogPortal, DialogOverlay } from '@/components/ui/dialog';

interface RaiseDisputeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  transactionNumber: string;
  maxAmount: number;
  onDisputeRaised?: () => void | Promise<void>;
}

export function RaiseDisputeModal({
  open,
  onOpenChange,
  transactionId,
  transactionNumber,
  maxAmount,
  onDisputeRaised,
}: RaiseDisputeModalProps) {
  const [category, setCategory] = useState<'DAMAGED_GOODS' | 'SHORTAGE' | 'SPECIFICATION_MISMATCH' | 'DELAY' | 'OTHER'>('SPECIFICATION_MISMATCH');
  const [claimAmount, setClaimAmount] = useState<string>(maxAmount.toString());
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a specific reason (at least 5 characters).');
      return;
    }

    const parsedClaim = parseFloat(claimAmount);
    if (isNaN(parsedClaim) || parsedClaim <= 0 || parsedClaim > maxAmount) {
      setError(`Claim amount must be between ₹1 and ${formatINR(maxAmount)}.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/transactions/${transactionId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category,
          reason: reason.trim(),
          claimAmount: parsedClaim,
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to file dispute');
      }

      onOpenChange(false);
      if (onDisputeRaised) await onDisputeRaised();
    } catch (err: any) {
      setError(err.message || 'Failed to submit dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-800 bg-zinc-900 p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-2xl'
          )}
        >
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
              <AlertOctagon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-base font-bold text-zinc-100">
                Raise Formal Escrow Dispute
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-zinc-400">
                Transaction: <strong className="text-zinc-200 font-mono">{transactionNumber}</strong>
              </DialogPrimitive.Description>
            </div>
          </div>

          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <strong>Immediate Effect:</strong> Filing a dispute immediately freezes all Deadman&apos;s Switch SLA timers and prevents automated release of escrow funds. A compliance officer will review the claim.
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="mb-1 block font-semibold text-zinc-300">
                Dispute Category <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-red-500 focus:outline-none"
              >
                <option value="SPECIFICATION_MISMATCH">Specification Mismatch / Incorrect Items</option>
                <option value="DAMAGED_GOODS">Damaged or Defective Goods</option>
                <option value="SHORTAGE">Quantity Shortage / Missing Units</option>
                <option value="DELAY">Unreasonable Shipping Delay</option>
                <option value="OTHER">Other Contractual Breach</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-zinc-300">
                Disputed Claim Amount (INR) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="number"
                  step="0.01"
                  max={maxAmount}
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-8 pr-3 py-2 font-mono text-zinc-100 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                Total escrow locked: {formatINR(maxAmount)}
              </span>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-zinc-300">
                Primary Reason <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. 50 units missing from shipment and packaging damaged"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-zinc-300">
                Detailed Explanation & Evidence Summary (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide batch numbers, photographic notes, or details to assist compliance arbitration…"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none min-h-[70px]"
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-300 font-medium">
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-500 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertOctagon className="h-4 w-4" />}
                Submit & Freeze Escrow
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
