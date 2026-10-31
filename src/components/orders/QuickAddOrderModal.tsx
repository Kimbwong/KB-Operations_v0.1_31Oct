/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Quick Add Order Modal with real-time capacity and duplicate checks (ORD01-ORD06, CAP01-CAP05)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  AlertTriangle,
  UserPlus,
  Check,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  BakeSession,
  CapacityGroup,
  Customer,
  Order,
  OrderStatus,
  Product,
} from '../../types';
import { formatCents, parseDollarsToCents } from '../../services/formatters';
import { checkOrderCapacity, getSessionCapacitySummaries } from '../../services/capacity';
import { storageService } from '../../services/storage';

interface QuickAddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
  customers: Customer[];
  bakeSessions: BakeSession[];
  products: Product[];
  capacityGroups: CapacityGroup[];
  allOrders: Order[];
}

export const QuickAddOrderModal: React.FC<QuickAddOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  customers,
  bakeSessions,
  products,
  capacityGroups,
  allOrders,
}) => {
  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [discountInput, setDiscountInput] = useState<string>('0.00');
  const [status, setStatus] = useState<OrderStatus>('confirmed');
  const [collectionWindow, setCollectionWindow] = useState<string>('14:30 – 16:30');
  const [requestSource, setRequestSource] = useState<'whatsapp' | 'instagram' | 'referral' | 'other'>('whatsapp');
  const [notes, setNotes] = useState<string>('');
  const [allowDuplicate, setAllowDuplicate] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New Customer inline state
  const [isCreatingCustomer, setIsCreatingCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustPref, setNewCustPref] = useState<string>('');

  // Auto-select nearest open session on open
  useEffect(() => {
    if (isOpen) {
      const openSessions = bakeSessions.filter((s) => s.status === 'open');
      if (openSessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(openSessions[0].id);
      }
      if (customers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(customers[0].id);
      }
      setAllowDuplicate(false);
      setError(null);
    }
  }, [isOpen, bakeSessions, customers]);

  // Selected session object
  const currentSession = useMemo(() => {
    return bakeSessions.find((s) => s.id === selectedSessionId);
  }, [bakeSessions, selectedSessionId]);

  // Subtotal calculation
  const subtotalCents = useMemo(() => {
    let sum = 0;
    for (const [prodId, qty] of Object.entries(quantities)) {
      if (qty > 0) {
        const p = products.find((prod) => prod.id === prodId);
        if (p) sum += p.priceCents * qty;
      }
    }
    return sum;
  }, [quantities, products]);

  const discountCents = useMemo(() => {
    return parseDollarsToCents(discountInput);
  }, [discountInput]);

  const totalCents = Math.max(0, subtotalCents - discountCents);

  // Duplicate order check (ORD06)
  const existingSimilarOrder = useMemo(() => {
    if (!selectedCustomerId || !selectedSessionId) return undefined;
    return storageService.checkSimilarExistingOrder(selectedCustomerId, selectedSessionId);
  }, [selectedCustomerId, selectedSessionId, allOrders]);

  // Capacity live check (CAP01 - CAP05)
  const capacityCheck = useMemo(() => {
    if (!currentSession) return { allowed: true, results: [], blockReason: undefined };

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([prodId, qty]) => {
        const prod = products.find((p) => p.id === prodId);
        return {
          id: 'temp',
          orderId: 'temp',
          productId: prodId,
          productNameSnapshot: prod?.name || '',
          quantity: qty,
          unitPriceCents: prod?.priceCents || 0,
          capacityUnitsSnapshot: prod?.capacityUnits || 0,
          capacityGroupIdSnapshot: prod?.capacityGroupId || '',
        };
      });

    if (items.length === 0) return { allowed: true, results: [], blockReason: undefined };

    const tempOrder: Order = {
      id: 'temp_order',
      ownerId: 'owner',
      displayReference: 'TEMP',
      customerId: selectedCustomerId,
      bakeSessionId: currentSession.id,
      status,
      requestSource,
      discountCents,
      totalCents,
      revision: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items,
      payments: [],
    };

    return checkOrderCapacity(
      currentSession,
      allOrders,
      tempOrder,
      status,
      capacityGroups,
      new Date()
    );
  }, [currentSession, quantities, status, products, allOrders, selectedCustomerId, discountCents, totalCents, capacityGroups]);

  // Session capacity summaries
  const sessionSummaries = useMemo(() => {
    if (!currentSession) return [];
    return getSessionCapacitySummaries(currentSession, allOrders, capacityGroups);
  }, [currentSession, allOrders, capacityGroups]);

  if (!isOpen) return null;

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleCreateNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    try {
      const created = storageService.saveCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        preferences: newCustPref.trim() || undefined,
        source: requestSource,
      });
      setSelectedCustomerId(created.id);
      setIsCreatingCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustPref('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomerId) {
      setError('Please select or add a customer (ORD01).');
      return;
    }

    if (!selectedSessionId) {
      setError('Please select a bake session (ORD01).');
      return;
    }

    const orderItems = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (orderItems.length === 0) {
      setError('Please add at least one product item with quantity > 0 (ORD01).');
      return;
    }

    if (discountCents > subtotalCents) {
      setError('Discount cannot exceed subtotal (ORD04).');
      return;
    }

    // Duplicate check acknowledgment (ORD06)
    if (existingSimilarOrder && !allowDuplicate) {
      setError(
        `A confirmed/pending order (${existingSimilarOrder.displayReference}) already exists for this customer on this bake date. Check the confirmation box below to confirm this is an intentional second order.`
      );
      return;
    }

    // Capacity block check
    if (!capacityCheck.allowed) {
      setError(capacityCheck.blockReason || 'Capacity limit reached for this session.');
      return;
    }

    try {
      const createdOrder = storageService.saveOrder({
        customerId: selectedCustomerId,
        bakeSessionId: selectedSessionId,
        items: orderItems,
        status,
        requestSource,
        discountCents,
        collectionWindow,
        notes: notes.trim(),
      });

      onOrderCreated(createdOrder);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
          <div>
            <h3 className="font-serif-heading text-xl font-bold text-[#282624]">
              Capture & Confirm Order
            </h3>
            <p className="text-xs text-[#6B655F]">
              Direct WhatsApp & customer order intake (PRD Section 2)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Customer Selection */}
          <div className="rounded-xl border border-[#D3C7B6] bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6B655F]">
                1. Customer (ORD01)
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingCustomer(!isCreatingCustomer)}
                className="text-xs font-semibold text-[#526043] hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isCreatingCustomer ? 'Select Existing' : '+ New Customer'}</span>
              </button>
            </div>

            {isCreatingCustomer ? (
              <div className="space-y-2.5 pt-1">
                <input
                  type="text"
                  placeholder="Full Name (required)"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full rounded-lg border border-[#D3C7B6] px-3 py-1.5 text-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone number (+65... or 8/9 digits)"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#D3C7B6] px-3 py-1.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="Preferences / Dietary notes (e.g. likes dark crust, no nuts)"
                  value={newCustPref}
                  onChange={(e) => setNewCustPref(e.target.value)}
                  className="w-full rounded-lg border border-[#D3C7B6] px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCreateNewCustomer}
                  className="w-full rounded-lg bg-[#526043] py-2 text-xs font-bold text-white hover:bg-[#3F4C33]"
                >
                  Save & Select Customer
                </button>
              </div>
            ) : (
              <div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-[#D3C7B6] bg-[#FAF7F2] px-3 py-2 text-sm text-[#282624] font-medium"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} — {c.source}
                    </option>
                  ))}
                </select>

                {/* Duplicate order alert banner (ORD06) */}
                {existingSimilarOrder && (
                  <div className="mt-2.5 rounded-lg bg-amber-50 border border-amber-300 p-2.5 text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Existing Order Detected (ORD06)</span>
                    </div>
                    <p className="mt-0.5 text-amber-800">
                      {customers.find((c) => c.id === selectedCustomerId)?.name} already has order{' '}
                      <strong>{existingSimilarOrder.displayReference}</strong> ({existingSimilarOrder.status}) for this bake date.
                    </p>
                    <label className="mt-2 flex items-center gap-2 font-semibold cursor-pointer text-[#282624]">
                      <input
                        type="checkbox"
                        checked={allowDuplicate}
                        onChange={(e) => setAllowDuplicate(e.target.checked)}
                        className="rounded text-[#526043] focus:ring-[#526043] w-4 h-4"
                      />
                      <span>Allow intentional second order for this customer & session</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Bake Session Selection & Capacity Gauge */}
          <div className="rounded-xl border border-[#D3C7B6] bg-white p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-1.5">
              2. Target Bake Session (CAP01 - CAP05)
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-[#FAF7F2] px-3 py-2 text-sm font-semibold text-[#282624]"
            >
              <option value="">-- Choose Session --</option>
              {bakeSessions.map((s) => (
                <option key={s.id} value={s.id} disabled={s.status !== 'open'}>
                  {s.bakeDate} ({s.status.toUpperCase()}) — {s.notes?.substring(0, 35)}
                </option>
              ))}
            </select>

            {/* Capacity status pill row */}
            {sessionSummaries.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {sessionSummaries.map((sum) => (
                  <div
                    key={sum.groupId}
                    className={`rounded-lg border p-2 ${
                      sum.available <= 0
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-[#EEF2EB] border-[#C8D6BE] text-[#3F4C33]'
                    }`}
                  >
                    <div className="flex justify-between font-bold">
                      <span>{sum.groupName}</span>
                      <span>
                        {sum.available} of {sum.limit} {sum.unitLabel} left
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-600">
                      <span>Confirmed: {sum.confirmedDemand}</span>
                      <span>•</span>
                      <span>Holds: {sum.unexpiredHolds}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Products & Quantities */}
          <div className="rounded-xl border border-[#D3C7B6] bg-white p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-2">
              3. Products & Quantities (ORD01, Snapshot Isolation ORD05)
            </label>

            <div className="space-y-2">
              {products
                .filter((p) => p.active)
                .map((product) => {
                  const qty = quantities[product.id] || 0;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-[#E4DDD3] hover:bg-[#FAF7F2] transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-[#282624]">{product.name}</span>
                          <span className="text-[10px] uppercase font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                            {product.category}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B655F]">
                          {formatCents(product.priceCents)} / {product.unitLabel} •{' '}
                          {product.capacityUnits} cap units
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(product.id, -1)}
                          disabled={qty <= 0}
                          className="w-8 h-8 rounded-lg border border-[#D3C7B6] bg-white flex items-center justify-center text-stone-700 disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold font-mono-numbers">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(product.id, 1)}
                          className="w-8 h-8 rounded-lg border border-[#D3C7B6] bg-[#526043] text-white flex items-center justify-center hover:bg-[#3F4C33]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 4. Pricing, Discount & Totals */}
          <div className="rounded-xl border border-[#D3C7B6] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#6B655F]">
              <span>Subtotal:</span>
              <span className="font-bold text-[#282624] font-mono-numbers">
                {formatCents(subtotalCents)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6B655F]">
                Order Discount (ORD04)
              </label>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1.5 text-xs font-bold text-[#6B655F]">
                  S$
                </span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="w-full rounded-lg border border-[#D3C7B6] pl-7 pr-2 py-1 text-right text-sm font-bold"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#E4DDD3] flex items-center justify-between text-base font-bold text-[#282624]">
              <span>Total Balance:</span>
              <span className="font-mono-numbers text-lg text-[#526043]">
                {formatCents(totalCents)}
              </span>
            </div>
          </div>

          {/* 5. Status, Window & Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Order Status (ORD02)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-xs font-semibold"
              >
                <option value="confirmed">Confirmed (Uses capacity)</option>
                <option value="pending">Pending Hold (24h hold)</option>
                <option value="draft">Draft (No capacity hold)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Channel Source
              </label>
              <select
                value={requestSource}
                onChange={(e) => setRequestSource(e.target.value as any)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-xs"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram DM</option>
                <option value="referral">Word of Mouth / Referral</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Collection Window
              </label>
              <input
                type="text"
                value={collectionWindow}
                onChange={(e) => setCollectionWindow(e.target.value)}
                placeholder="14:00 – 16:30"
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Private Order Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Bringing own bread bag; slices at home (never sent to customer)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-xs"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="mt-4 flex gap-2 pt-3 border-t border-[#E4DDD3]">
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-[#6B655F] hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="touch-target flex-1 rounded-xl bg-[#526043] py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#3F4C33] flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
