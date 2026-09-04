'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
}

export function Tooltip({
  content,
  children,
  className,
  side = 'top',
  delayMs = 150,
}: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  };

  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isOpen && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 max-w-xs rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 shadow-xl backdrop-blur animate-in fade-in-0 zoom-in-95 pointer-events-none whitespace-normal text-left leading-relaxed',
            sideClasses[side],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

interface HoverCardProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  width?: string;
}

export function HoverCard({
  trigger,
  children,
  className,
  width = 'w-80',
}: HoverCardProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleOpen = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
  };

  const handleClose = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative inline-block w-full" onMouseEnter={handleOpen} onMouseLeave={handleClose}>
      <div className="cursor-pointer" onClick={handleToggle}>{trigger}</div>
      {isOpen && (
        <div
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          className={cn(
            'absolute bottom-full left-0 mb-2 z-50 rounded-xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95',
            width,
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
