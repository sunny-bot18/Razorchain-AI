'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LucideIcon,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusConfig {
  style: string;
  icon?: LucideIcon;
}

const STYLES: Record<string, StatusConfig> = {
  CREATED: {
    style: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  },
  PAYMENT_AUTHORIZED: {
    style: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  FUNDS_RESERVED: {
    style: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  DELIVERY_PENDING: {
    style: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    icon: Clock,
  },
  IN_TRANSIT_UNVERIFIED: {
    style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    icon: Clock,
  },
  VERIFICATION_PENDING: {
    style: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    icon: Clock,
  },
  AWAITING_MANUAL_TRIAGE: {
    style: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: AlertTriangle,
  },
  VERIFIED: {
    style: 'bg-green-500/15 text-green-300 border-green-500/30',
    icon: ShieldCheck,
  },
  CAPTURE_REQUESTED: {
    style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  SETTLEMENT_QUEUED: {
    style: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    icon: Clock,
  },
  SETTLED: {
    style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
  },
  MANUAL_REVIEW: {
    style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    icon: AlertTriangle,
  },
  VERIFICATION_FAILED: {
    style: 'bg-red-500/15 text-red-300 border-red-500/30',
    icon: XCircle,
  },
  PAYMENT_FAILED: {
    style: 'bg-red-500/15 text-red-300 border-red-500/30',
    icon: XCircle,
  },
  DISPUTED: {
    style: 'bg-red-500/15 text-red-300 border-red-500/30',
    icon: XCircle,
  },
  REFUNDED: {
    style: 'bg-red-500/15 text-red-300 border-red-500/30',
    icon: XCircle,
  },
  CANCELLED: {
    style: 'bg-red-500/15 text-red-300 border-red-500/30',
    icon: XCircle,
  },
};

export default function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const config = STYLES[status];
  const style = config?.style || 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30';
  const Icon = config?.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        style,
        className
      )}
    >
      {Icon && <Icon className="mr-1 h-3 w-3 inline-block" />}
      {status.replace(/_/g, ' ')}
    </span>
  );
}