/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Accessible status badges with text labels and distinct visual cues
 */

import React from 'react';
import { ContentStatus, OrderStatus, PaymentStatus, ShotStatus } from '../../types';

interface StatusBadgeProps {
  type: 'order' | 'payment' | 'content' | 'shot';
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, size = 'sm' }) => {
  let label = status.replace(/_/g, ' ');
  let styleClasses = 'bg-stone-100 text-stone-700 border-stone-200';
  let dotColor = 'bg-stone-400';

  if (type === 'order') {
    const s = status as OrderStatus;
    if (s === 'confirmed') {
      label = 'Confirmed';
      styleClasses = 'bg-[#EEF2EB] text-[#3F4C33] border-[#C8D6BE]';
      dotColor = 'bg-[#526043]';
    } else if (s === 'pending') {
      label = 'Pending Hold';
      styleClasses = 'bg-amber-50 text-amber-900 border-amber-200';
      dotColor = 'bg-amber-500 animate-pulse';
    } else if (s === 'collected') {
      label = 'Collected';
      styleClasses = 'bg-emerald-50 text-emerald-900 border-emerald-200';
      dotColor = 'bg-emerald-600';
    } else if (s === 'draft') {
      label = 'Draft';
      styleClasses = 'bg-stone-100 text-stone-600 border-stone-200';
      dotColor = 'bg-stone-400';
    } else if (s === 'cancelled' || s === 'declined') {
      label = s === 'cancelled' ? 'Cancelled' : 'Declined';
      styleClasses = 'bg-rose-50 text-rose-800 border-rose-200';
      dotColor = 'bg-rose-500';
    }
  } else if (type === 'payment') {
    const s = status as PaymentStatus;
    if (s === 'paid') {
      label = 'Fully Paid';
      styleClasses = 'bg-emerald-50 text-emerald-900 border-emerald-200 font-medium';
      dotColor = 'bg-emerald-600';
    } else if (s === 'part_paid') {
      label = 'Part Paid';
      styleClasses = 'bg-amber-50 text-amber-900 border-amber-200';
      dotColor = 'bg-amber-500';
    } else if (s === 'unpaid') {
      label = 'Unpaid';
      styleClasses = 'bg-rose-50 text-rose-800 border-rose-200';
      dotColor = 'bg-rose-500';
    } else if (s === 'refund_due') {
      label = 'Refund Due';
      styleClasses = 'bg-purple-50 text-purple-900 border-purple-200';
      dotColor = 'bg-purple-600';
    }
  } else if (type === 'content') {
    const s = status as ContentStatus;
    if (s === 'ready') {
      label = 'Ready';
      styleClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dotColor = 'bg-emerald-600';
    } else if (s === 'planned') {
      label = 'Planned';
      styleClasses = 'bg-sky-50 text-sky-800 border-sky-200';
      dotColor = 'bg-sky-600';
    } else if (s === 'published') {
      label = 'Published';
      styleClasses = 'bg-[#EEF2EB] text-[#3F4C33] border-[#C8D6BE]';
      dotColor = 'bg-[#526043]';
    } else if (s === 'idea') {
      label = 'Idea';
      styleClasses = 'bg-amber-50 text-amber-800 border-amber-200';
      dotColor = 'bg-amber-400';
    } else if (s === 'skipped') {
      label = 'Skipped';
      styleClasses = 'bg-stone-100 text-stone-500 border-stone-200';
      dotColor = 'bg-stone-400';
    }
  } else if (type === 'shot') {
    const s = status as ShotStatus;
    if (s === 'captured') {
      label = 'Captured';
      styleClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dotColor = 'bg-emerald-600';
    } else if (s === 'needed') {
      label = 'Needed';
      styleClasses = 'bg-amber-50 text-amber-900 border-amber-200';
      dotColor = 'bg-amber-500';
    } else if (s === 'skipped') {
      label = 'Skipped';
      styleClasses = 'bg-stone-100 text-stone-500 border-stone-200';
      dotColor = 'bg-stone-400';
    }
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${styleClasses} ${padding} uppercase tracking-wider font-semibold`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
};
