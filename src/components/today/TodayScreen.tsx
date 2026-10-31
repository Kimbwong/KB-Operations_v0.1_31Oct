/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Today Screen (PRD Section 2)
 * Next bake, pending requests, unpaid confirmed orders, collection checklist, priority shots
 */

import React, { useMemo } from 'react';
import {
  Flame,
  Clock,
  AlertCircle,
  PackageCheck,
  Camera,
  ArrowRight,
  Plus,
  Check,
  ChevronRight,
  Wheat,
} from 'lucide-react';
import { AppState } from '../../services/storage';
import { calculateOrderBalance, formatCents, formatDate } from '../../services/formatters';
import { getSessionCapacitySummaries } from '../../services/capacity';
import { StatusBadge } from '../common/StatusBadge';
import { Order, Shot } from '../../types';

interface TodayScreenProps {
  appState: AppState;
  onQuickAddOrder: () => void;
  onOpenOrder: (order: Order) => void;
  onNavigateToTab: (tab: any) => void;
  onToggleShotStatus: (shotId: string, currentStatus: Shot['status']) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  appState,
  onQuickAddOrder,
  onOpenOrder,
  onNavigateToTab,
  onToggleShotStatus,
}) => {
  const { bakeSessions, orders, customers, products, shots, capacityGroups, settings } = appState;

  // Next open bake session
  const nextSession = useMemo(() => {
    return (
      bakeSessions.find((s) => s.status === 'open') ||
      bakeSessions[0] ||
      undefined
    );
  }, [bakeSessions]);

  // Capacity summary for next session
  const nextSessionSummaries = useMemo(() => {
    if (!nextSession) return [];
    return getSessionCapacitySummaries(nextSession, orders, capacityGroups);
  }, [nextSession, orders, capacityGroups]);

  // Pending requests with holds
  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'pending');
  }, [orders]);

  // Unpaid confirmed orders (Section 2)
  const unpaidConfirmedOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status !== 'confirmed') return false;
      const { paymentStatus } = calculateOrderBalance(o.totalCents, o.payments);
      return paymentStatus === 'unpaid' || paymentStatus === 'part_paid';
    });
  }, [orders]);

  // Collection checklist: confirmed orders for next session
  const collectionList = useMemo(() => {
    if (!nextSession) return [];
    return orders.filter(
      (o) => o.bakeSessionId === nextSession.id && (o.status === 'confirmed' || o.status === 'collected')
    );
  }, [orders, nextSession]);

  // Up to 3 priority shots for next session (PRD Section 2 & CON06)
  const priorityShots = useMemo(() => {
    if (!nextSession) return [];
    return shots
      .filter((s) => s.bakeSessionId === nextSession.id && s.priority === 'high')
      .slice(0, 3);
  }, [shots, nextSession]);

  return (
    <div className="space-y-6 pb-20">
      {/* Banner / Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#526043] to-[#3F4C33] p-5 text-white shadow-sm">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#D3DECA] font-bold">
            KimB's Workspace
          </span>
          <h2 className="font-serif-heading text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">
            Today’s Bake Operations
          </h2>
          <p className="text-xs text-[#E6EFE2] mt-1 max-w-lg">
            Consolidated production, priority content captures, and order collection without recounting messages.
          </p>
        </div>
        <button
          onClick={onQuickAddOrder}
          className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#3F4C33] px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-[#FAF7F2] active:scale-[0.98] transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Order</span>
        </button>
      </div>

      {/* Grid: Next Bake & Priority Shots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Next Bake Card (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#EEF2EB] text-[#526043]">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Next Production
                </span>
                <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                  {nextSession ? formatDate(nextSession.bakeDate) : 'No upcoming session scheduled'}
                </h3>
              </div>
            </div>

            {nextSession && (
              <button
                onClick={() => onNavigateToTab('bake')}
                className="text-xs font-bold text-[#526043] hover:underline flex items-center gap-1"
              >
                <span>Bake Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {nextSession ? (
            <div className="mt-4 space-y-4">
              {/* Capacity Status */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-2">
                  Session Capacity Limits & Availability
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {nextSessionSummaries.map((sum) => (
                    <div
                      key={sum.groupId}
                      className="rounded-xl border border-[#D8CEBF] bg-[#FAF7F2] p-3 text-xs"
                    >
                      <div className="font-bold text-[#282624] truncate">{sum.groupName}</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-bold font-mono-numbers text-[#526043]">
                          {sum.available}
                        </span>
                        <span className="text-stone-500">/ {sum.limit} {sum.unitLabel} left</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#526043] transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              ((sum.confirmedDemand + sum.unexpiredHolds) / (sum.limit || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-stone-500 font-mono-numbers">
                        <span>{sum.confirmedDemand} confirmed</span>
                        <span>{sum.unexpiredHolds} held</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {nextSession.notes && (
                <p className="text-xs text-stone-600 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E4DDD3]">
                  <strong>Bake note:</strong> {nextSession.notes}
                </p>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-stone-500 text-xs">
              Create a bake session in Bake Planner to schedule production.
            </div>
          )}
        </div>

        {/* Priority Shots Card (1 col) */}
        <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Content Linked
                </span>
                <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                  Priority Shots (Max 3)
                </h3>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('content')}
              className="text-xs font-bold text-[#526043] hover:underline"
            >
              All Shots
            </button>
          </div>

          <div className="mt-4 flex-1 space-y-2.5">
            {priorityShots.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-4 text-center">
                No high-priority shots linked to this bake.
              </p>
            ) : (
              priorityShots.map((shot) => {
                const isCaptured = shot.status === 'captured';
                return (
                  <div
                    key={shot.id}
                    className={`p-3 rounded-xl border transition-all text-xs flex items-start gap-2.5 ${
                      isCaptured
                        ? 'bg-emerald-50/60 border-emerald-200 text-stone-600'
                        : 'bg-[#FAF7F2] border-[#D8CEBF] text-[#282624]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleShotStatus(shot.id, shot.status)}
                      className={`touch-target mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isCaptured
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-stone-400 bg-white hover:border-[#526043]'
                      }`}
                      title={isCaptured ? 'Mark Needed' : 'Mark Captured'}
                    >
                      {isCaptured && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold">{shot.phase.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-stone-500">{shot.durationMinutes} min</span>
                      </div>
                      <p className={`mt-0.5 text-[11px] leading-snug ${isCaptured ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                        {shot.description}
                      </p>
                      {shot.setup && (
                        <p className="mt-1 text-[10px] text-[#526043] font-medium">
                          Setup: {shot.setup}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-[#E4DDD3] text-[10px] text-stone-500 italic">
            Practical rule: Content capture is optional and never adds saleable loaves to production.
          </div>
        </div>
      </div>

      {/* Two columns: Pending Requests & Unpaid Confirmed Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pending Requests & Holds */}
        <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                Pending Requests ({pendingOrders.length})
              </h3>
            </div>
            <span className="text-xs text-stone-500">24h Holds</span>
          </div>

          <div className="mt-3 space-y-2">
            {pendingOrders.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-4 text-center">
                No active pending holds. All orders confirmed or completed!
              </p>
            ) : (
              pendingOrders.map((ord) => {
                const customer = customers.find((c) => c.id === ord.customerId);
                return (
                  <div
                    key={ord.id}
                    onClick={() => onOpenOrder(ord)}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#282624]">{ord.displayReference}</span>
                        <span className="text-stone-600 font-semibold">{customer?.name}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {ord.items.map((i) => `${i.quantity}x ${i.productNameSnapshot}`).join(', ')}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold font-mono-numbers text-stone-800">
                        {formatCents(ord.totalCents)}
                      </span>
                      <div className="text-[10px] text-amber-800 font-semibold mt-0.5">
                        Awaiting confirm
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Unpaid Confirmed Orders (Section 2) */}
        <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                Unpaid Confirmed Orders ({unpaidConfirmedOrders.length})
              </h3>
            </div>
            <span className="text-xs text-stone-500">PayNow Outstanding</span>
          </div>

          <div className="mt-3 space-y-2">
            {unpaidConfirmedOrders.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-4 text-center">
                All confirmed orders have payments recorded.
              </p>
            ) : (
              unpaidConfirmedOrders.map((ord) => {
                const customer = customers.find((c) => c.id === ord.customerId);
                const { balanceCents } = calculateOrderBalance(ord.totalCents, ord.payments);
                return (
                  <div
                    key={ord.id}
                    onClick={() => onOpenOrder(ord)}
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#282624]">{ord.displayReference}</span>
                        <span className="text-stone-700 font-semibold">{customer?.name}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {ord.items.map((i) => `${i.quantity}x ${i.productNameSnapshot}`).join(', ')}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold font-mono-numbers text-rose-700">
                        {formatCents(balanceCents)} due
                      </span>
                      <div className="text-[10px] text-stone-500 mt-0.5">
                        Tap to record payment
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Collection Checklist for Next Bake */}
      <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#526043]" />
            <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
              Collection Checklist ({collectionList.filter((o) => o.status === 'collected').length} / {collectionList.length} collected)
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            {nextSession ? formatDate(nextSession.bakeDate) : 'Today'}
          </span>
        </div>

        <div className="mt-3 divide-y divide-[#E4DDD3]">
          {collectionList.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-4 text-center">
              No orders scheduled for this session.
            </p>
          ) : (
            collectionList.map((ord) => {
              const customer = customers.find((c) => c.id === ord.customerId);
              const isCollected = ord.status === 'collected';
              const { balanceCents } = calculateOrderBalance(ord.totalCents, ord.payments);

              return (
                <div
                  key={ord.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div
                    onClick={() => onOpenOrder(ord)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#282624]">{ord.displayReference}</span>
                      <span className="font-semibold text-stone-800">{customer?.name}</span>
                      <StatusBadge type="order" status={ord.status} />
                    </div>
                    <div className="text-[11px] text-stone-600 mt-0.5 flex items-center gap-2">
                      <span>Window: <strong>{ord.collectionWindow || '14:00 - 17:00'}</strong></span>
                      <span>•</span>
                      <span>{ord.items.map((i) => `${i.quantity}x ${i.productNameSnapshot}`).join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono-numbers font-semibold ${
                        balanceCents > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {balanceCents > 0 ? `${formatCents(balanceCents)} due` : 'Paid'}
                    </span>

                    <button
                      type="button"
                      onClick={() => onOpenOrder(ord)}
                      className="touch-target p-1.5 text-stone-400 hover:text-[#526043]"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
