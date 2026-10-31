/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Orders Administration Screen (PRD Section 2, ORD01 - ORD06)
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  ChevronRight,
  ClipboardList,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { AppState } from '../../services/storage';
import { calculateOrderBalance, formatCents, formatDate } from '../../services/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { downloadFile, generateOrdersCsv } from '../../services/exportRestore';

interface OrdersScreenProps {
  appState: AppState;
  onOpenOrder: (order: Order) => void;
  onQuickAddOrder: () => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  appState,
  onOpenOrder,
  onQuickAddOrder,
}) => {
  const { orders, customers, bakeSessions } = appState;

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sessionFilter, setSessionFilter] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const customer = customers.find((c) => c.id === order.customerId);
      const session = bakeSessions.find((s) => s.id === order.bakeSessionId);

      // Search matching reference, customer name, phone, notes
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesRef = order.displayReference.toLowerCase().includes(term);
        const matchesName = customer?.name.toLowerCase().includes(term);
        const matchesPhone = customer?.phone?.toLowerCase().includes(term);
        const matchesNotes = order.notes?.toLowerCase().includes(term);
        if (!matchesRef && !matchesName && !matchesPhone && !matchesNotes) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // Payment status filter
      if (paymentFilter !== 'all') {
        const { paymentStatus } = calculateOrderBalance(order.totalCents, order.payments);
        if (paymentStatus !== paymentFilter) return false;
      }

      // Session filter
      if (sessionFilter !== 'all' && order.bakeSessionId !== sessionFilter) {
        return false;
      }

      return true;
    });
  }, [orders, customers, bakeSessions, searchTerm, statusFilter, paymentFilter, sessionFilter]);

  const totalValueCents = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.totalCents, 0);
  }, [filteredOrders]);

  const handleExportCsv = () => {
    const csvContent = generateOrdersCsv();
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(csvContent, `kharis-bake-orders-${dateStr}.csv`, 'text/csv');
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif-heading text-2xl font-bold text-[#282624]">
            Order Administration
          </h2>
          <p className="text-xs text-[#6B655F]">
            Search by customer or reference; confirm holds and manage collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-xs font-semibold text-[#4A4541] hover:bg-[#FAF7F2] transition-colors"
            title="Export orders to CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onQuickAddOrder}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#526043] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#3F4C33] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-[#D3C7B6] bg-white p-4 shadow-sm space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone (+65...), or ref (KB-2611-001)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[#D3C7B6] bg-[#FAF7F2] pl-10 pr-4 py-2.5 text-xs text-[#282624] placeholder-stone-400 focus:border-[#526043] focus:bg-white"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Order Lifecycle Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-1.5 text-xs font-medium text-[#282624]"
            >
              <option value="all">All Lifecycle Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending Hold</option>
              <option value="collected">Collected</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Payment Status (ORD03)
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-1.5 text-xs font-medium text-[#282624]"
            >
              <option value="all">All Payment States</option>
              <option value="unpaid">Unpaid</option>
              <option value="part_paid">Part Paid</option>
              <option value="paid">Fully Paid</option>
              <option value="refund_due">Refund Due</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Target Bake Date
            </label>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-1.5 text-xs font-medium text-[#282624]"
            >
              <option value="all">All Bake Sessions</option>
              {bakeSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.bakeDate)} ({s.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Header Count & Summary */}
      <div className="flex items-center justify-between text-xs text-[#6B655F] px-1 font-medium">
        <span>
          Showing <strong>{filteredOrders.length}</strong> orders
        </span>
        <span>
          Filtered Value: <strong className="text-[#526043] font-mono-numbers">{formatCents(totalValueCents)}</strong>
        </span>
      </div>

      {/* Orders List / Table */}
      <div className="rounded-2xl border border-[#D3C7B6] bg-white shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-xs">
            <ClipboardList className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            <p>No orders matched your current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E4DDD3]">
            {filteredOrders.map((order) => {
              const customer = customers.find((c) => c.id === order.customerId);
              const session = bakeSessions.find((s) => s.id === order.bakeSessionId);
              const { totalPaidCents, balanceCents, paymentStatus } = calculateOrderBalance(
                order.totalCents,
                order.payments
              );

              return (
                <div
                  key={order.id}
                  onClick={() => onOpenOrder(order)}
                  className="p-4 hover:bg-[#FAF7F2] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Left Column: Reference, Customer & Bake Date */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#282624] font-mono-numbers">
                        {order.displayReference}
                      </span>
                      <StatusBadge type="order" status={order.status} />
                      <StatusBadge type="payment" status={paymentStatus} />
                    </div>

                    <div className="flex items-center gap-2 text-stone-700">
                      <span className="font-semibold text-sm">{customer?.name || 'Unknown'}</span>
                      {customer?.phone && (
                        <span className="text-stone-500 text-[11px]">({customer.phone})</span>
                      )}
                      <span className="text-stone-400">•</span>
                      <span className="text-stone-500">
                        {session ? formatDate(session.bakeDate) : 'No session'}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600">
                      {order.items
                        .map((it) => `${it.quantity}x ${it.productNameSnapshot}`)
                        .join(' • ')}
                    </p>
                  </div>

                  {/* Right Column: Financials & Action Arrow */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-none border-stone-100">
                    <div className="text-left sm:text-right">
                      <div className="font-bold text-sm text-[#282624] font-mono-numbers">
                        {formatCents(order.totalCents)}
                      </div>
                      <div
                        className={`text-[11px] font-semibold font-mono-numbers ${
                          balanceCents > 0
                            ? 'text-rose-700'
                            : balanceCents < 0
                            ? 'text-purple-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {balanceCents > 0
                          ? `${formatCents(balanceCents)} due`
                          : balanceCents < 0
                          ? `${formatCents(balanceCents)} refund`
                          : 'Fully Paid'}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-stone-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
