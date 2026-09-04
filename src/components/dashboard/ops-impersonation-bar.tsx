'use client';

import React from 'react';
import { UserCheck, Eye, ShieldAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OpsImpersonationBarProps {
  currentRole: 'BUYER' | 'SELLER' | 'ADMIN';
  viewAsRole: 'BUYER' | 'SELLER' | 'ADMIN' | null;
  onSelectViewAs: (role: 'BUYER' | 'SELLER' | 'ADMIN' | null) => void;
  className?: string;
}

export function OpsImpersonationBar({
  currentRole,
  viewAsRole,
  onSelectViewAs,
  className,
}: OpsImpersonationBarProps) {
  if (currentRole !== 'ADMIN') return null;

  return (
    <div
      className={cn(
        'rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3 text-xs transition-all shadow-md',
        viewAsRole
          ? 'border-amber-500/50 bg-amber-950/40 text-amber-200'
          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-amber-400 shrink-0" />
        <div>
          <span className="font-bold text-zinc-100">
            {viewAsRole ? `Scoped Impersonation Active: [${viewAsRole}]` : 'Operations View-As Switcher'}
          </span>
          <span className="text-[11px] text-zinc-400 block sm:inline sm:ml-2">
            {viewAsRole
              ? 'Previewing counterparty perspective (write/override actions disabled).'
              : 'Inspect specific counterparty workflows safely.'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-mono text-zinc-500">View as:</span>
        <button
          onClick={() => onSelectViewAs('BUYER')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors border',
            viewAsRole === 'BUYER'
              ? 'border-blue-500 bg-blue-600 text-white'
              : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          )}
        >
          Buyer
        </button>
        <button
          onClick={() => onSelectViewAs('SELLER')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors border',
            viewAsRole === 'SELLER'
              ? 'border-violet-500 bg-violet-600 text-white'
              : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          )}
        >
          Seller
        </button>
        {viewAsRole && (
          <button
            onClick={() => onSelectViewAs(null)}
            className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:text-white"
            title="Exit Impersonation"
          >
            <X className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
