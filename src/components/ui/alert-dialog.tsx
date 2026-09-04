'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, ShieldAlert, Loader2, KeyRound, Clock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DialogPortal, DialogOverlay } from './dialog';

interface TypedConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requiredKeyword?: string;
  warningNote?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: (data?: { keyword: string; reason: string; password?: string }) => void | Promise<void>;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  onReasonChange?: (reason: string) => void;
  requireStepUpAuth?: boolean;
  stepUpAuthLabel?: string;
  onPasswordChange?: (password: string) => void;
  onKeywordChange?: (keyword: string) => void;
  sessionTimeoutSeconds?: number;
}

export function TypedConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  requiredKeyword,
  warningNote,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  requireReason = false,
  reasonPlaceholder = 'Provide an audit explanation for this decision…',
  onReasonChange,
  requireStepUpAuth = false,
  stepUpAuthLabel = 'Re-enter your Account Password for Step-Up Authorization',
  onPasswordChange,
  onKeywordChange,
  sessionTimeoutSeconds = 300,
}: TypedConfirmationDialogProps) {
  const [typedInput, setTypedInput] = React.useState('');
  const [reasonInput, setReasonInput] = React.useState('');
  const [passwordInput, setPasswordInput] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [secondsRemaining, setSecondsRemaining] = React.useState(sessionTimeoutSeconds);

  React.useEffect(() => {
    if (!open) {
      setTypedInput('');
      setReasonInput('');
      setPasswordInput('');
      setSecondsRemaining(sessionTimeoutSeconds);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [open, sessionTimeoutSeconds]);

  const handleReasonChange = (val: string) => {
    setReasonInput(val);
    onReasonChange?.(val);
  };

  const isKeywordValid = !requiredKeyword || typedInput.trim().toUpperCase() === requiredKeyword.toUpperCase();
  const isReasonValid = !requireReason || reasonInput.trim().length >= 5;
  const isPasswordValid = !requireStepUpAuth || passwordInput.trim().length >= 6;
  const isSessionValid = secondsRemaining > 0;
  const isActionDisabled = !isKeywordValid || !isReasonValid || !isPasswordValid || !isSessionValid || isLoading;

  const formatTimeout = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  isDestructive ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                )}
              >
                {isDestructive ? <ShieldAlert className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div className="space-y-1">
                <DialogPrimitive.Title className="text-base font-bold text-zinc-100">
                  {title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-zinc-400 leading-relaxed">
                  {description}
                </DialogPrimitive.Description>
              </div>
            </div>

            {/* Session Expiry Countdown Indicator */}
            <div
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono shrink-0 border',
                secondsRemaining < 60
                  ? 'border-red-500/40 bg-red-500/15 text-red-400 animate-pulse'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400'
              )}
              title="Session authorization timeout"
            >
              <Clock className="h-3 w-3" />
              <span>{formatTimeout(secondsRemaining)}</span>
            </div>
          </div>

          {warningNote && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {warningNote}
            </div>
          )}

          {requireReason && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Audit Trail Explanation <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reasonInput}
                onChange={(e) => handleReasonChange(e.target.value)}
                placeholder={reasonPlaceholder}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none min-h-[60px]"
              />
            </div>
          )}

          {/* Step-Up Authentication (Password / Security Pin) */}
          {requireStepUpAuth && (
            <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                <span>{stepUpAuthLabel}</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    onPasswordChange?.(e.target.value);
                  }}
                  placeholder="Enter current password to sign override"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 pr-10 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          {requiredKeyword && (
            <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5">
              <p className="text-xs text-zinc-300">
                To confirm this high-stakes action, type{' '}
                <strong className="font-mono font-bold text-red-400 select-all">{requiredKeyword}</strong> below:
              </p>
              <input
                type="text"
                value={typedInput}
                onChange={(e) => {
                  setTypedInput(e.target.value);
                  onKeywordChange?.(e.target.value);
                }}
                placeholder={`Type "${requiredKeyword}" to enable`}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 pt-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isActionDisabled}
              onClick={async () => {
                await onConfirm({
                  keyword: typedInput,
                  reason: reasonInput,
                  password: passwordInput,
                });
              }}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white transition-all shadow-lg',
                isDestructive
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none'
              )}
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
