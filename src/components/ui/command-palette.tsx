'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Command,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  Filter,
  FilePlus2,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { DialogPortal, DialogOverlay } from './dialog';

export interface CommandOption {
  id: string;
  label: string;
  category: string;
  icon: React.ElementType;
  shortcut?: string;
  badge?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFilter?: (filterKey: string) => void;
  transactions?: Array<{
    id: string;
    transactionNumber: string;
    buyerName?: string;
    sellerName?: string;
    amount: number;
    status: string;
  }>;
}

export function CommandPalette({
  open,
  onOpenChange,
  onSelectFilter,
  transactions = [],
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Listen for global Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const presetCommands: CommandOption[] = [
    {
      id: 'filter_action',
      label: 'Show: Requires Your Action (Inbox Zero)',
      category: 'Smart Filters',
      icon: Clock,
      badge: 'Action',
      action: () => {
        onSelectFilter?.('action_required');
        onOpenChange(false);
      },
    },
    {
      id: 'filter_flagged',
      label: 'Show: Discrepancy Flagged / Review Needed',
      category: 'Smart Filters',
      icon: ShieldAlert,
      badge: 'Review',
      action: () => {
        onSelectFilter?.('discrepancy_flagged');
        onOpenChange(false);
      },
    },
    {
      id: 'filter_reserved',
      label: 'Show: Active Vault Escrows (Funds Reserved)',
      category: 'Smart Filters',
      icon: Lock,
      badge: 'Escrow',
      action: () => {
        onSelectFilter?.('reserved');
        onOpenChange(false);
      },
    },
    {
      id: 'filter_settled',
      label: 'Show: Settled & Completed Transactions',
      category: 'Smart Filters',
      icon: CheckCircle2,
      badge: 'Completed',
      action: () => {
        onSelectFilter?.('settled');
        onOpenChange(false);
      },
    },
    {
      id: 'filter_high_value',
      label: 'Show: High-Value Escrows (≥ ₹10,00,000 / Dual Approval)',
      category: 'Smart Filters',
      icon: SlidersHorizontal,
      badge: 'Enterprise',
      action: () => {
        onSelectFilter?.('high_value');
        onOpenChange(false);
      },
    },
    {
      id: 'nav_create',
      label: 'Create New Escrow Purchase Order',
      category: 'Navigation',
      icon: FilePlus2,
      action: () => {
        router.push('/buyer/create');
        onOpenChange(false);
      },
    },
  ];

  // Transaction quick-jumps
  const txnCommands: CommandOption[] = transactions.map((t) => ({
    id: t.id,
    label: `${t.transactionNumber} · ${t.buyerName || 'Buyer'} → ${t.sellerName || 'Seller'} · ₹${t.amount.toLocaleString('en-IN')}`,
    category: 'Transactions',
    icon: FileText,
    badge: t.status,
    action: () => {
      router.push(`/buyer/transaction/${t.id}`);
      onOpenChange(false);
    },
  }));

  const allCommands = [...presetCommands, ...txnCommands];

  const filteredCommands = query.trim()
    ? allCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase()) ||
          (c.badge && c.badge.toLowerCase().includes(query.toLowerCase()))
      )
    : allCommands;

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[25%] z-50 w-full max-w-xl translate-x-[-50%] translate-y-[-25%] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl animate-in fade-in-0 zoom-in-95"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3 bg-zinc-950">
            <Search className="h-5 w-5 text-zinc-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command, filter, or transaction number… (e.g. 'Discrepancy Flagged')"
              className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            <kbd className="hidden sm:inline-block rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
              ESC to close
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-[340px] overflow-y-auto p-2 space-y-1">
            {filteredCommands.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500">
                No matching filters or transactions found.
              </p>
            ) : (
              filteredCommands.map((cmd, idx) => {
                const Icon = cmd.icon;
                const isSelected = idx === selectedIndex;

                return (
                  <div
                    key={cmd.id}
                    onClick={() => cmd.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-3 py-2.5 text-xs cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-zinc-300 hover:bg-zinc-800/80'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={cn('h-4 w-4 shrink-0', isSelected ? 'text-white' : 'text-zinc-400')} />
                      <span className="truncate">{cmd.label}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {cmd.badge && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold',
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          )}
                        >
                          {cmd.badge}
                        </span>
                      )}
                      <ArrowRight className={cn('h-3.5 w-3.5 opacity-60', isSelected && 'opacity-100')} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2 text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
            </div>
            <span>Quick Escrow Switcher</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
