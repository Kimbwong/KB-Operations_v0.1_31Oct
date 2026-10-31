/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bake Planner Screen (PRD Section 2, CAP01 - CAP05, CON08)
 * Session calendar, consolidated production totals, capacity limits, prep checklist, print layout
 */

import React, { useState, useMemo } from 'react';
import {
  Printer,
  Plus,
  Flame,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Package,
  Calendar,
  Layers,
  Edit2,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { AppState, storageService } from '../../services/storage';
import {
  getConsolidatedProductionTotals,
  getSessionCapacitySummaries,
} from '../../services/capacity';
import { calculateOrderBalance, formatCents, formatDate, formatDateTime } from '../../services/formatters';
import { BakeSession, CapacityGroup, Order, PrepTask } from '../../types';
import { downloadFile, generateProductionCsv } from '../../services/exportRestore';
import { StatusBadge } from '../common/StatusBadge';

interface BakePlannerScreenProps {
  appState: AppState;
  onOpenOrder: (order: Order) => void;
}

export const BakePlannerScreen: React.FC<BakePlannerScreenProps> = ({
  appState,
  onOpenOrder,
}) => {
  const { bakeSessions, orders, products, prepTasks, capacityGroups, shots, customers } = appState;

  // Active selected session
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    bakeSessions[0]?.id || ''
  );

  // Edit session limits modal
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCloseWarningModal, setShowCloseWarningModal] = useState(false);

  // Print mode trigger
  const [isPrintMode, setIsPrintMode] = useState(false);

  const currentSession = useMemo(() => {
    return bakeSessions.find((s) => s.id === selectedSessionId) || bakeSessions[0];
  }, [bakeSessions, selectedSessionId]);

  // Consolidated production totals (confirmed separate from holds, CAP03, A4)
  const productionTotals = useMemo(() => {
    if (!currentSession) return [];
    return getConsolidatedProductionTotals(currentSession.id, orders, products);
  }, [currentSession, orders, products]);

  // Capacity breakdown
  const capacitySummaries = useMemo(() => {
    if (!currentSession) return [];
    return getSessionCapacitySummaries(currentSession, orders, capacityGroups);
  }, [currentSession, orders, capacityGroups]);

  // Session orders
  const sessionOrders = useMemo(() => {
    if (!currentSession) return [];
    return orders.filter((o) => o.bakeSessionId === currentSession.id);
  }, [orders, currentSession]);

  // Session prep tasks
  const sessionTasks = useMemo(() => {
    if (!currentSession) return [];
    return prepTasks
      .filter((t) => t.bakeSessionId === currentSession.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [prepTasks, currentSession]);

  // Linked shots for this session (CON03)
  const linkedShots = useMemo(() => {
    if (!currentSession) return [];
    return shots.filter((s) => s.bakeSessionId === currentSession.id);
  }, [shots, currentSession]);

  const handleToggleTask = (taskId: string) => {
    storageService.togglePrepTask(taskId);
  };

  const handleExportProductionCsv = () => {
    if (!currentSession) return;
    const csv = generateProductionCsv(currentSession.id);
    downloadFile(csv, `kharis-bake-production-${currentSession.bakeDate}.csv`, 'text/csv');
  };

  const handlePrint = () => {
    window.print();
  };

  // Close session action with uncollected warning (Section 2)
  const handleRequestCloseSession = () => {
    if (!currentSession) return;
    const uncollectedCount = storageService.getUncollectedOrdersCount(currentSession.id);
    if (uncollectedCount > 0) {
      setShowCloseWarningModal(true);
    } else {
      storageService.saveBakeSession({
        ...currentSession,
        status: 'completed',
      });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="font-serif-heading text-2xl font-bold text-[#282624]">
            Bake Planner & Production
          </h2>
          <p className="text-xs text-[#6B655F]">
            Consolidated production quantities, prep checklist & capacity controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportProductionCsv}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-xs font-semibold text-[#4A4541] hover:bg-[#FAF7F2]"
            title="Download CSV for kitchen production"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV Sheet</span>
          </button>

          <button
            onClick={handlePrint}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-[#526043] bg-[#EEF2EB] px-3.5 py-2 text-xs font-bold text-[#3F4C33] hover:bg-[#DCE6D7]"
            title="Print clean kitchen bake sheet"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Session Selector Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-print">
        {bakeSessions.map((session) => {
          const isSelected = currentSession?.id === session.id;
          const isCompleted = session.status === 'completed';
          return (
            <button
              key={session.id}
              onClick={() => setSelectedSessionId(session.id)}
              className={`touch-target px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 ${
                isSelected
                  ? 'border-[#526043] bg-white ring-2 ring-[#526043]/30 shadow-sm'
                  : 'border-[#D3C7B6] bg-[#FAF7F2] hover:bg-white text-stone-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-serif-heading text-sm font-bold text-[#282624]">
                  {formatDate(session.bakeDate)}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    isCompleted
                      ? 'bg-stone-200 text-stone-700'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {session.status}
                </span>
              </div>
              <p className="text-[11px] text-[#6B655F] mt-0.5">
                Cutoff: {formatDateTime(session.orderCutoffAt)}
              </p>
            </button>
          );
        })}
      </div>

      {currentSession && (
        <div className="space-y-6">
          {/* Printable Kitchen Header (visible in print) */}
          <div className="hidden print:block mb-4 border-b pb-2">
            <h1 className="text-xl font-bold">Kharis Bake — Production Bake Sheet</h1>
            <p className="text-sm text-stone-600">
              Bake Date: {formatDate(currentSession.bakeDate)} • Generated on {new Date().toLocaleString('en-SG')}
            </p>
          </div>

          {/* Consolidated Production Totals Card (ORD04, A4) */}
          <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Authoritative Totals (Section 3 & A4)
                </span>
                <h3 className="font-serif-heading text-xl font-bold text-[#282624]">
                  Consolidated Production Quantities
                </h3>
              </div>
              <span className="text-xs text-stone-500 font-medium no-print">
                Confirmed orders only (holds shown separately)
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E4DDD3] text-[10px] uppercase font-bold text-[#6B655F]">
                    <th className="py-2.5">Product Name</th>
                    <th className="py-2.5 text-center">Unit</th>
                    <th className="py-2.5 text-center font-bold text-[#3F4C33]">
                      Confirmed To Bake
                    </th>
                    <th className="py-2.5 text-center text-amber-800">Pending Holds</th>
                    <th className="py-2.5 text-center">Orders Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DDD3]">
                  {productionTotals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone-500 italic">
                        No orders recorded for this session yet.
                      </td>
                    </tr>
                  ) : (
                    productionTotals.map((item) => (
                      <tr key={item.productId} className="hover:bg-[#FAF7F2]">
                        <td className="py-3 font-semibold text-sm text-[#282624]">
                          {item.productName}
                        </td>
                        <td className="py-3 text-center text-stone-500 capitalize">
                          {item.unitLabel}
                        </td>
                        <td className="py-3 text-center">
                          <span className="font-mono-numbers text-base font-bold text-[#526043] bg-[#EEF2EB] px-2.5 py-1 rounded-lg">
                            {item.confirmedQuantity}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          {item.heldQuantity > 0 ? (
                            <span className="font-mono-numbers font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                              +{item.heldQuantity} hold
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3 text-center text-stone-600 font-mono-numbers">
                          {item.orderCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Capacity Limits & Allocation Row (no-print) */}
          <div className="rounded-2xl border border-[#D3C7B6] bg-[#FAF7F2] p-5 shadow-sm no-print space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Capacity Limits (CAP01 - CAP05)
                </span>
                <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                  Group Limits & Committed Demand
                </h3>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditSessionModal(true)}
                  className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#D3C7B6] bg-white px-2.5 py-1 text-xs font-semibold text-[#526043] hover:bg-[#F2ECE1]"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Adjust Limits</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(true)}
                  className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#D3C7B6] bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-[#F2ECE1]"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reschedule (CON08)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {capacitySummaries.map((sum) => (
                <div
                  key={sum.groupId}
                  className="rounded-xl border border-[#D8CEBF] bg-white p-3.5 text-xs shadow-xs"
                >
                  <div className="flex justify-between items-center font-bold text-[#282624]">
                    <span>{sum.groupName}</span>
                    <span
                      className={`font-mono-numbers ${
                        sum.available <= 0 ? 'text-rose-700' : 'text-[#526043]'
                      }`}
                    >
                      {sum.available} left
                    </span>
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-stone-600">
                    <span>Limit: {sum.limit}</span>
                    <span>Committed: {sum.confirmedDemand}</span>
                    <span>Holds: {sum.unexpiredHolds}</span>
                  </div>
                  <div className="mt-2 h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        sum.available <= 0 ? 'bg-rose-500' : 'bg-[#526043]'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          ((sum.confirmedDemand + sum.unexpiredHolds) / (sum.limit || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prep Tasks Checklist & Collection Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Kitchen Prep Checklist */}
            <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#526043]" />
                  <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                    Kitchen Prep Checklist
                  </h3>
                </div>
                <span className="text-xs text-stone-500">
                  {sessionTasks.filter((t) => t.completedAt).length} / {sessionTasks.length} done
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {sessionTasks.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-4 text-center">
                    No prep tasks configured for this session.
                  </p>
                ) : (
                  sessionTasks.map((task) => {
                    const isDone = !!task.completedAt;
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-xs ${
                          isDone
                            ? 'bg-stone-50 border-stone-200 text-stone-500 line-through'
                            : 'bg-[#FAF7F2] border-[#D8CEBF] text-[#282624] hover:border-[#526043]'
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isDone
                              ? 'bg-[#526043] border-[#526043] text-white'
                              : 'border-stone-400 bg-white'
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium leading-snug">{task.description}</p>
                          {task.completedAt && (
                            <span className="text-[10px] text-stone-400 mt-0.5 block">
                              Completed: {formatDateTime(task.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Collection Schedule & Status */}
            <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#526043]" />
                  <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                    Customer Collections
                  </h3>
                </div>
                <span className="text-xs text-stone-500">
                  Window: {formatDateTime(currentSession.collectionStartAt).split(',')[1]} -{' '}
                  {formatDateTime(currentSession.collectionEndAt).split(',')[1]}
                </span>
              </div>

              <div className="mt-3 divide-y divide-[#E4DDD3]">
                {sessionOrders.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-4 text-center">
                    No orders for this session.
                  </p>
                ) : (
                  sessionOrders.map((ord) => {
                    const cust = customers.find((c) => c.id === ord.customerId);
                    const { balanceCents } = calculateOrderBalance(ord.totalCents, ord.payments);
                    return (
                      <div
                        key={ord.id}
                        onClick={() => onOpenOrder(ord)}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs hover:bg-[#FAF7F2] p-1.5 rounded-lg cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#282624]">{ord.displayReference}</span>
                            <span className="font-semibold text-stone-800">{cust?.name}</span>
                            <StatusBadge type="order" status={ord.status} />
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Window: {ord.collectionWindow} •{' '}
                            {ord.items.map((i) => `${i.quantity}x ${i.productNameSnapshot}`).join(', ')}
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono-numbers font-semibold ${
                              balanceCents > 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {balanceCents > 0 ? `${formatCents(balanceCents)} due` : 'Paid'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Close Session Action with warning if uncollected orders remain */}
              {currentSession.status === 'open' && (
                <div className="mt-4 pt-3 border-t border-[#E4DDD3] flex justify-end no-print">
                  <button
                    type="button"
                    onClick={handleRequestCloseSession}
                    className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-100 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-stone-600" />
                    <span>Complete / Close Bake Session</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close Warning Modal (Section 2) */}
      {showCloseWarningModal && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#FAF7F2] border border-amber-300 p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-900 pb-2 border-b border-amber-200">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <h3 className="font-serif-heading text-lg font-bold">
                Uncollected Orders Warning (PRD Section 2)
              </h3>
            </div>
            <p className="mt-3 text-xs text-[#4A4541] leading-relaxed">
              This session still has{' '}
              <strong>{storageService.getUncollectedOrdersCount(currentSession.id)} uncollected orders</strong>.
              Closing a session with uncollected orders requires explicit acknowledgement.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCloseWarningModal(false)}
                className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-stone-700 hover:bg-stone-100"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  storageService.saveBakeSession({
                    ...currentSession,
                    status: 'completed',
                  });
                  setShowCloseWarningModal(false);
                }}
                className="touch-target flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-amber-700"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal with Affected Shots Resolution (CON08, A6) */}
      {showRescheduleModal && currentSession && (
        <RescheduleSessionModal
          session={currentSession}
          linkedShots={linkedShots}
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
        />
      )}

      {/* Adjust Capacity Limits Modal (CAP05) */}
      {showEditSessionModal && currentSession && (
        <AdjustLimitsModal
          session={currentSession}
          capacityGroups={capacityGroups}
          orders={orders}
          isOpen={showEditSessionModal}
          onClose={() => setShowEditSessionModal(false)}
        />
      )}
    </div>
  );
};

// Subcomponent: RescheduleSessionModal (CON08, A6)
const RescheduleSessionModal: React.FC<{
  session: BakeSession;
  linkedShots: any[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ session, linkedShots, isOpen, onClose }) => {
  const [newDate, setNewDate] = useState<string>(session.bakeDate);
  const [shotResolution, setShotResolution] = useState<'move' | 'unlink' | 'keep'>('move');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!newDate) return;
    try {
      storageService.saveBakeSession({
        ...session,
        bakeDate: newDate,
      });

      // Handle linked shots resolution (CON08)
      if (shotResolution === 'unlink') {
        linkedShots.forEach((s) => {
          storageService.saveShot({
            ...s,
            bakeSessionId: undefined,
          });
        });
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl">
        <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
          Reschedule Bake Session (CON08)
        </h3>
        <p className="text-xs text-[#6B655F] mt-1">
          Moving date for session: {session.bakeDate}
        </p>

        {error && (
          <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              New Bake Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-sm"
            />
          </div>

          {linkedShots.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
              <div className="font-bold">
                ⚠️ {linkedShots.length} Linked Content Shots Affected (CON08)
              </div>
              <p className="text-[11px] text-amber-800">
                Choose how to resolve shots linked to this session:
              </p>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="res"
                    value="move"
                    checked={shotResolution === 'move'}
                    onChange={() => setShotResolution('move')}
                  />
                  <span>Move shots with session to new date</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="res"
                    value="unlink"
                    checked={shotResolution === 'unlink'}
                    onChange={() => setShotResolution('unlink')}
                  />
                  <span>Unlink shots (keep content items independent)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="res"
                    value="keep"
                    checked={shotResolution === 'keep'}
                    onChange={() => setShotResolution('keep')}
                  />
                  <span>Keep with warning</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2 text-xs font-bold uppercase tracking-wider text-stone-700 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="touch-target flex-1 rounded-xl bg-[#526043] py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#3F4C33]"
          >
            Confirm Reschedule
          </button>
        </div>
      </div>
    </div>
  );
};

// Subcomponent: AdjustLimitsModal (CAP05)
const AdjustLimitsModal: React.FC<{
  session: BakeSession;
  capacityGroups: CapacityGroup[];
  orders: Order[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ session, capacityGroups, orders, isOpen, onClose }) => {
  const [limits, setLimits] = useState<Record<string, number>>({ ...session.groupLimits });
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    setError(null);
    try {
      storageService.saveBakeSession({
        ...session,
        groupLimits: limits,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl">
        <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
          Adjust Session Capacity Limits (CAP01, CAP05)
        </h3>
        <p className="text-xs text-[#6B655F] mt-1">
          Bake Date: {session.bakeDate}. Reducing limits below committed demand is blocked.
        </p>

        {error && (
          <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {capacityGroups.map((grp) => (
            <div key={grp.id} className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-[#282624]">{grp.name}</span>
                <span className="text-[10px] text-stone-500 block">Unit: {grp.unitLabel}</span>
              </div>
              <input
                type="number"
                min="0"
                value={limits[grp.id] ?? grp.defaultLimit}
                onChange={(e) =>
                  setLimits({ ...limits, [grp.id]: parseInt(e.target.value, 10) || 0 })
                }
                className="w-24 rounded-lg border border-[#D3C7B6] bg-white px-2.5 py-1 text-right text-sm font-bold font-mono-numbers"
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2 text-xs font-bold uppercase tracking-wider text-stone-700 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="touch-target flex-1 rounded-xl bg-[#526043] py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#3F4C33]"
          >
            Update Limits
          </button>
        </div>
      </div>
    </div>
  );
};
