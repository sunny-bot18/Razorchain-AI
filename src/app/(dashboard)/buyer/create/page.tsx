'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONDITIONS = [
  'PO Match',
  'Quantity Match',
  'Address Match',
  'Date Valid',
  'Signed Proof',
];

interface Seller {
  id: string;
  name: string;
  email: string;
  company?: string | null;
}

export default function CreateTransaction() {
  const router = useRouter();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [form, setForm] = useState({
    sellerId: '',
    poNumber: '',
    productDescription: '',
    quantity: '',
    amount: '',
    deliveryAddress: '',
    expectedDeliveryDate: '',
    inspectionWindowHours: '72',
    sellerGracePeriodHours: '168',
  });
  const [conditions, setConditions] = useState<string[]>([...CONDITIONS]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Array<{ label: string; percentage: string }>>([]);
  const [showMilestones, setShowMilestones] = useState(false);

  const milestonesTotal = milestones.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0);
  const milestonesValid = milestones.length === 0 || Math.abs(milestonesTotal - 100) < 0.01;

  const addMilestone = () => {
    if (milestones.length >= 5) return;
    const remaining = 100 - milestonesTotal;
    setMilestones((prev) => [...prev, { label: `Milestone ${prev.length + 1}`, percentage: String(Math.max(0, remaining).toFixed(0)) }]);
  };
  const removeMilestone = (i: number) => setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  const updateMilestone = (i: number, field: 'label' | 'percentage', value: string) =>
    setMilestones((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));


  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/users?role=SELLER', {
          credentials: 'include',
        });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (!res.ok) {
          // Some environments list via GET /api/transactions fallback; surface gracefully
          const err = await res.json();
          throw new Error(err.error || 'Failed to load sellers');
        }
        const data = await res.json();
        const rawSellers: Seller[] = data.users || data.sellers || [];
        // Sort Apex Precision Engineering Ltd (seller@demo.com) to the top
        const sortedSellers = [...rawSellers].sort((a, b) => {
          if (a.email === 'seller@demo.com') return -1;
          if (b.email === 'seller@demo.com') return 1;
          return a.name.localeCompare(b.name);
        });
        setSellers(sortedSellers);
        if (sortedSellers.length > 0) {
          const defaultSeller = sortedSellers.find((s) => s.email === 'seller@demo.com') || sortedSellers[0];
          setForm((prev) => (prev.sellerId ? prev : { ...prev, sellerId: defaultSeller.id }));
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Failed to load sellers. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const toggleCondition = (c: string) => {
    setConditions((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestonesValid) {
      setError(`Milestone percentages must sum to exactly 100% (current: ${milestonesTotal.toFixed(1)}%)`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        sellerId: form.sellerId,
        poNumber: form.poNumber,
        productDescription: form.productDescription,
        quantity: Number(form.quantity),
        amount: Number(form.amount),
        deliveryAddress: form.deliveryAddress,
        expectedDeliveryDate: new Date(form.expectedDeliveryDate).toISOString(),
        verificationConditions: conditions,
        inspectionWindowHours: Number(form.inspectionWindowHours) || 72,
        sellerGracePeriodHours: Number(form.sellerGracePeriodHours) || 168,
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create transaction');
      }

      const data = await res.json();
      const txId = data.transaction.id;

      // Create milestone plan if defined
      if (milestones.length > 0 && milestonesValid) {
        const totalAmount = Number(form.amount);
        const milestonePayload = milestones.map((m, i) => ({
          sequence: i + 1,
          label: m.label.trim() || `Milestone ${i + 1}`,
          percentage: parseFloat(m.percentage),
          amount: (parseFloat(m.percentage) / 100) * totalAmount,
          requiredDocuments: i === milestones.length - 1 ? ['delivery_receipt', 'invoice'] : ['invoice'],
        }));
        await fetch(`/api/transactions/${txId}/milestones`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestones: milestonePayload }),
        });
      }

      router.push(`/buyer/transaction/${txId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create transaction');
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelClass = 'mb-1 block text-xs font-medium text-zinc-400';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Create Transaction</h1>
        <p className="text-sm text-zinc-500">
          Define a purchase order — our AI contract agent will parse it into a
          verifiable agreement.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
          Order Details
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Seller</label>
            <select
              className={inputClass}
              value={form.sellerId}
              onChange={(e) => setForm({ ...form, sellerId: e.target.value })}
              required
            >
              <option value="" disabled>
                {loading ? 'Loading sellers…' : 'Select a seller'}
              </option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company ? `${s.name} (${s.company})` : s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>PO Number</label>
            <input
              className={inputClass}
              value={form.poNumber}
              onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
              placeholder="PO-2026-001"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Product Description</label>
            <textarea
              className={cn(inputClass, 'min-h-[70px]')}
              value={form.productDescription}
              onChange={(e) =>
                setForm({ ...form, productDescription: e.target.value })
              }
              placeholder="e.g. 500 units of industrial grade bearings"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input
              type="number"
              min="1"
              className={inputClass}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="500"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Amount (INR)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={inputClass}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="250000"
              required
            />
            {form.amount && Number(form.amount) > 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                ₹{Number(form.amount).toLocaleString('en-IN')} will be reserved from your account
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Delivery Address</label>
            <input
              className={inputClass}
              value={form.deliveryAddress}
              onChange={(e) =>
                setForm({ ...form, deliveryAddress: e.target.value })
              }
              placeholder="Warehouse 12, MIDC Phase 2, Mumbai"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Expected Delivery Date</label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              className={inputClass}
              value={form.expectedDeliveryDate}
              onChange={(e) =>
                setForm({ ...form, expectedDeliveryDate: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400">
            AI Verification Conditions
          </label>
          <p className="mb-2 text-[11px] text-zinc-600">
            Select what the AI should verify in the seller&apos;s delivery documents.
          </p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => {
              const checked = conditions.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCondition(c)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    checked
                      ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  {checked ? '✓ ' : ''}
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Escrow settings */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Escrow Settings</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Inspection Window (hours)</label>
              <input type="number" min="1" max="720" className={inputClass}
                value={form.inspectionWindowHours}
                onChange={(e) => setForm({ ...form, inspectionWindowHours: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-zinc-600">Time buyer has to review before funds auto-release to seller (deadman&apos;s switch). Default: 72h.</p>
            </div>
            <div>
              <label className={labelClass}>Seller Grace Period (hours)</label>
              <input type="number" min="1" max="720" className={inputClass}
                value={form.sellerGracePeriodHours}
                onChange={(e) => setForm({ ...form, sellerGracePeriodHours: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-zinc-600">After expected delivery date, how long seller has to submit documents before auto-refund. Default: 168h (7d).</p>
            </div>
          </div>
        </div>

        {/* Milestone plan builder */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Milestone Tranche Plan (optional)</p>
            <button type="button" onClick={() => setShowMilestones((s) => !s)}
              className="text-xs text-blue-400 hover:text-blue-300">
              {showMilestones ? 'Hide' : 'Add milestones →'}
            </button>
          </div>
          {showMilestones && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-zinc-500">
                Define payment tranches (e.g., 20% advance, 30% on shipment, 50% on delivery). All percentages must sum to exactly 100%.
                Funds for each tranche release only after that milestone&apos;s documents are verified.
              </p>
              {milestones.map((m, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="w-6 text-xs text-zinc-500 font-mono">{i + 1}.</span>
                  <input
                    value={m.label}
                    onChange={(e) => updateMilestone(i, 'label', e.target.value)}
                    placeholder="e.g. Advance on PO acceptance"
                    className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="1" max="100"
                      value={m.percentage}
                      onChange={(e) => updateMilestone(i, 'percentage', e.target.value)}
                      className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-center text-sm text-zinc-100"
                    />
                    <span className="text-xs text-zinc-500">%</span>
                    {form.amount && Number(form.amount) > 0 && (
                      <span className="text-xs text-zinc-500 ml-1">
                        ≈ ₹{((parseFloat(m.percentage) / 100) * Number(form.amount)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={() => removeMilestone(i)} className="text-xs text-red-400 hover:text-red-300 px-1">✕</button>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <button type="button" onClick={addMilestone} disabled={milestones.length >= 5}
                  className="text-xs text-blue-400 disabled:text-zinc-600 hover:text-blue-300">
                  + Add tranche
                </button>
                {milestones.length > 0 && (
                  <span className={cn('text-xs font-semibold', milestonesValid ? 'text-emerald-400' : 'text-red-400')}>
                    Total: {milestonesTotal.toFixed(1)}% {milestonesValid ? '✓' : '(must be 100%)'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/buyer')}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Creating…
              </span>
            ) : (
              'Create & Reserve Funds →'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
