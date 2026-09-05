'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Sparkles, ShieldCheck, FilePlus2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InboxZeroCardProps {
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  totalManagedCount?: number;
  className?: string;
  onExploreAll?: () => void;
}

export function InboxZeroCard({
  role,
  totalManagedCount = 0,
  className,
  onExploreAll,
}: InboxZeroCardProps) {
  let title = 'Inbox Zero Achieved!';
  let description = 'All pending purchase orders and settlements have been fully reviewed and authorized.';

  if (role === 'SELLER') {
    title = 'All Deliveries Up-to-Date!';
    description = 'No outstanding document proofs or carrier tracking registrations require your attention.';
  } else if (role === 'ADMIN') {
    title = 'Compliance Queue 100% Cleared!';
    description = 'Zero unresolved discrepancies or manual reviews on your desk.';
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-950 p-8 text-center shadow-xl space-y-4 max-w-xl mx-auto my-6',
        className
      )}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
        <CheckCircle2 className="h-8 w-8 animate-bounce" />
      </div>

      <div className="space-y-1">
        <h3 className="text-xl font-bold text-zinc-100 flex items-center justify-center gap-2">
          <span>{title}</span>
          <Sparkles className="h-4 w-4 text-emerald-400" />
        </h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {role === 'BUYER' && (
          <Link
            href="/buyer/create"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 transition-colors"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>Create New Purchase Order</span>
          </Link>
        )}

        {onExploreAll && (
          <button
            onClick={onExploreAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <span>View All Historical Escrows</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
