'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Created', 'Reserved', 'Delivery', 'Verified', 'Settled'];

// Map a transaction status to a numeric step index (0..4)
function statusToIndex(status: string): number {
  switch (status) {
    case 'SETTLED':
      return 4;
    case 'CAPTURE_REQUESTED':
      return 4;
    case 'VERIFIED':
    case 'VERIFICATION_PENDING':
    case 'MANUAL_REVIEW':
    case 'VERIFICATION_FAILED':
      return 3;
    case 'DELIVERY_PENDING':
      return 2;
    case 'PAYMENT_AUTHORIZED':
    case 'FUNDS_RESERVED':
      return 1;
    case 'CREATED':
    default:
      return 0;
  }
}

const FAILED = new Set([
  'VERIFICATION_FAILED',
  'PAYMENT_FAILED',
  'DISPUTED',
  'REFUNDED',
  'CANCELLED',
]);

export default function PipelineStepper({ status }: { status: string }) {
  const current = statusToIndex(status);
  const failed = FAILED.has(status);

  return (
    <div className="flex w-full items-center">
      {STEPS.map((label, i) => {
        // The final node is complete (not merely active) once funds settle.
        const completed = !failed && (i < current || (status === 'SETTLED' && i === current));
        const active = i === current && !completed;
        const isFailedStep = failed && i >= current;

        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                  completed && 'border-emerald-500 bg-emerald-500 text-white',
                  active &&
                    'border-blue-500 bg-blue-500/15 text-blue-300',
                  isFailedStep && 'border-red-500 bg-red-500/15 text-red-300',
                  !completed && !active && !isFailedStep &&
                    'border-zinc-700 bg-zinc-900 text-zinc-400'
                )}
              >
                {completed ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium',
                  completed ? 'text-emerald-300' : active ? 'text-blue-300' : 'text-zinc-500'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-1 mb-5 h-0.5 flex-1 rounded',
                  i < current ? 'bg-emerald-500' : 'bg-zinc-800'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
