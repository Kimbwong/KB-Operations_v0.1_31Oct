/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Formatting utilities for Kharis Bake Operations Planner
 */

export function formatCents(cents: number): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainder = absCents % 100;
  const formatted = `S$${dollars}.${remainder.toString().padStart(2, '0')}`;
  return isNegative ? `-${formatted}` : formatted;
}

export function parseDollarsToCents(val: string | number): number {
  if (typeof val === 'number') return Math.round(val * 100);
  const clean = val.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  // Handles 'YYYY-MM-DD' or ISO strings
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-SG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return dateString;
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-SG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function formatTimeRange(startIso: string, endIso: string): string {
  if (!startIso || !endIso) return '—';
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sTime = s.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false });
    const eTime = e.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${sTime} – ${eTime}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

export function calculateOrderBalance(totalCents: number, payments: { signedAmountCents: number }[]): {
  totalPaidCents: number;
  balanceCents: number;
  paymentStatus: 'unpaid' | 'part_paid' | 'paid' | 'refund_due';
} {
  const totalPaidCents = payments.reduce((acc, p) => acc + (p.signedAmountCents || 0), 0);
  const balanceCents = totalCents - totalPaidCents;

  let paymentStatus: 'unpaid' | 'part_paid' | 'paid' | 'refund_due' = 'unpaid';
  if (totalPaidCents === 0 && totalCents > 0) {
    paymentStatus = 'unpaid';
  } else if (totalPaidCents > 0 && totalPaidCents < totalCents) {
    paymentStatus = 'part_paid';
  } else if (totalPaidCents >= totalCents && balanceCents === 0) {
    paymentStatus = 'paid';
  } else if (balanceCents < 0) {
    paymentStatus = 'refund_due';
  } else if (totalPaidCents > 0 && totalCents === 0) {
    paymentStatus = 'refund_due';
  }

  return { totalPaidCents, balanceCents, paymentStatus };
}
