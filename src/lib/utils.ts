import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  if (typeof value === 'string') {
    const clean = value.trim().toLowerCase();
    if (clean.startsWith('(') || clean.includes('not found') || clean.includes('missing') || clean.includes('invalid')) {
      return '—';
    }
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return typeof value === 'string' && value.trim() ? value : '—';
  }
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  if (typeof value === 'string') {
    const clean = value.trim().toLowerCase();
    if (clean.startsWith('(') || clean.includes('not found') || clean.includes('missing') || clean.includes('invalid')) {
      return '—';
    }
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return typeof value === 'string' && value.trim() ? value : '—';
  }
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}