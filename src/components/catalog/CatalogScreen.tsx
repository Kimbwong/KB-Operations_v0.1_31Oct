/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Customers & Products Directory (PRD Section 2, Section 5)
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Package,
  Plus,
  Search,
  Phone,
  Edit2,
  AlertTriangle,
  History,
  Archive,
  Check,
  X,
} from 'lucide-react';
import { AppState, storageService } from '../../services/storage';
import { Customer, Order, Product } from '../../types';
import { formatCents, formatDate } from '../../services/formatters';

interface CatalogScreenProps {
  appState: AppState;
  onOpenOrder: (order: Order) => void;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({ appState, onOpenOrder }) => {
  const { customers, products, orders, capacityGroups } = appState;

  const [activeTab, setActiveTab] = useState<'customers' | 'products'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);

  // Selected customer for history drawer/modal
  const [viewHistoryCustomerId, setViewHistoryCustomerId] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.notes && c.notes.toLowerCase().includes(term)) ||
        (c.preferences && c.preferences.toLowerCase().includes(term))
      );
    });
  }, [customers, searchTerm]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term));
    });
  }, [products, searchTerm]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif-heading text-2xl font-bold text-[#282624]">
            Directory & Catalogue
          </h2>
          <p className="text-xs text-[#6B655F]">
            Customer profiles with order history, and product catalogue with snapshot pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'customers' ? (
            <button
              onClick={() => setIsNewCustomerOpen(true)}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#526043] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#3F4C33] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Customer</span>
            </button>
          ) : (
            <button
              onClick={() => setIsNewProductOpen(true)}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#526043] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#3F4C33] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#E4DDD3]">
        <button
          onClick={() => setActiveTab('customers')}
          className={`touch-target flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'customers'
              ? 'border-[#526043] text-[#526043]'
              : 'border-transparent text-stone-500 hover:text-[#282624]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customers ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`touch-target flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-[#526043] text-[#526043]'
              : 'border-transparent text-stone-500 hover:text-[#282624]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products ({products.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder={
            activeTab === 'customers'
              ? 'Search customers by name, phone (+65...), or notes...'
              : 'Search products by name or flavor...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-[#D3C7B6] bg-white pl-10 pr-4 py-2.5 text-xs text-[#282624] placeholder-stone-400 focus:border-[#526043]"
        />
      </div>

      {/* Customers Tab Content */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-[#D3C7B6] bg-white p-12 text-center text-stone-500 text-xs">
              No customers found.
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const custOrders = orders.filter((o) => o.customerId === cust.id);
              const totalSpent = custOrders.reduce((sum, o) => sum + o.totalCents, 0);

              return (
                <div
                  key={cust.id}
                  className="rounded-2xl border border-[#D3C7B6] bg-white p-4 shadow-sm flex flex-col justify-between text-xs space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-[#282624]">{cust.name}</h4>
                        <div className="flex items-center gap-1.5 text-stone-600 mt-0.5">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{cust.phone || 'No phone recorded'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {cust.source}
                      </span>
                    </div>

                    {cust.preferences && (
                      <div className="mt-2 text-[11px] text-[#526043] bg-[#EEF2EB] p-2 rounded-lg font-medium">
                        {cust.preferences}
                      </div>
                    )}

                    {cust.notes && (
                      <p className="mt-1 text-[11px] text-stone-500 italic">
                        {cust.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#E4DDD3] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-500">Orders: </span>
                      <strong className="text-stone-800 font-mono-numbers">
                        {custOrders.length}
                      </strong>
                      <span className="text-[10px] text-stone-400 ml-2">
                        ({formatCents(totalSpent)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewHistoryCustomerId(cust.id)}
                        className="touch-target text-xs text-[#526043] font-semibold hover:underline"
                      >
                        History
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCustomer(cust)}
                        className="touch-target p-1.5 text-stone-400 hover:text-stone-700"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Products Tab Content */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const grp = capacityGroups.find((g) => g.id === prod.capacityGroupId);
            return (
              <div
                key={prod.id}
                className={`rounded-2xl border p-4 shadow-sm flex flex-col justify-between text-xs space-y-3 ${
                  prod.archived
                    ? 'bg-stone-50 border-stone-200 opacity-60'
                    : 'bg-white border-[#D3C7B6]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-[#282624]">{prod.name}</h4>
                        {prod.archived && (
                          <span className="text-[9px] font-bold uppercase bg-stone-200 text-stone-700 px-1 rounded">
                            Archived
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-stone-500">
                        {prod.category} • {prod.unitLabel}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold font-mono-numbers text-[#526043]">
                        {formatCents(prod.priceCents)}
                      </div>
                      <span className="text-[10px] text-stone-500">
                        {prod.capacityUnits} capacity units
                      </span>
                    </div>
                  </div>

                  {prod.description && (
                    <p className="mt-2 text-[11px] text-stone-600 leading-relaxed">
                      {prod.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E4DDD3] flex items-center justify-between text-[11px]">
                  <span className="text-stone-500">Group: {grp?.name || 'Standard'}</span>

                  <button
                    type="button"
                    onClick={() => setEditingProduct(prod)}
                    className="touch-target inline-flex items-center gap-1 text-xs text-[#526043] font-semibold hover:underline"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Order History Modal */}
      {viewHistoryCustomerId && (
        <CustomerHistoryModal
          customerId={viewHistoryCustomerId}
          appState={appState}
          isOpen={!!viewHistoryCustomerId}
          onClose={() => setViewHistoryCustomerId(null)}
          onOpenOrder={onOpenOrder}
        />
      )}

      {/* Edit Customer Modal with duplicate phone warning (Section 5) */}
      {(isNewCustomerOpen || editingCustomer) && (
        <EditCustomerModal
          customer={editingCustomer}
          isOpen={isNewCustomerOpen || !!editingCustomer}
          onClose={() => {
            setIsNewCustomerOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {/* Edit Product Modal */}
      {(isNewProductOpen || editingProduct) && (
        <EditProductModal
          product={editingProduct}
          capacityGroups={capacityGroups}
          isOpen={isNewProductOpen || !!editingProduct}
          onClose={() => {
            setIsNewProductOpen(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

// Subcomponent: Customer History Modal
const CustomerHistoryModal: React.FC<{
  customerId: string;
  appState: AppState;
  isOpen: boolean;
  onClose: () => void;
  onOpenOrder: (order: Order) => void;
}> = ({ customerId, appState, isOpen, onClose, onOpenOrder }) => {
  const customer = appState.customers.find((c) => c.id === customerId);
  const custOrders = appState.orders.filter((o) => o.customerId === customerId);

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
          <div>
            <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
              {customer.name}’s Order History
            </h3>
            <p className="text-xs text-[#6B655F]">
              {custOrders.length} total orders recorded
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2 flex-1 overflow-y-auto">
          {custOrders.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-6 text-center">
              No orders placed by this customer yet.
            </p>
          ) : (
            custOrders.map((ord) => {
              const sess = appState.bakeSessions.find((s) => s.id === ord.bakeSessionId);
              return (
                <div
                  key={ord.id}
                  onClick={() => {
                    onClose();
                    onOpenOrder(ord);
                  }}
                  className="p-3 rounded-xl border border-[#D3C7B6] bg-white hover:bg-[#FAF7F2] cursor-pointer text-xs flex justify-between items-center transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#282624]">{ord.displayReference}</span>
                      <span className="text-stone-500">
                        {sess ? formatDate(sess.bakeDate) : 'Unknown session'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      {ord.items.map((it) => `${it.quantity}x ${it.productNameSnapshot}`).join(', ')}
                    </p>
                  </div>

                  <span className="font-bold font-mono-numbers text-[#526043]">
                    {formatCents(ord.totalCents)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Edit Customer Modal with Duplicate Phone Check (Section 5)
const EditCustomerModal: React.FC<{
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ customer, isOpen, onClose }) => {
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [source, setSource] = useState(customer?.source || 'whatsapp');
  const [preferences, setPreferences] = useState(customer?.preferences || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [error, setError] = useState<string | null>(null);

  // Check duplicate phone in real time (Section 5: "Warn about duplicate phone numbers; do not auto-merge")
  const duplicateCustomer = useMemo(() => {
    return storageService.checkDuplicatePhone(phone, customer?.id);
  }, [phone, customer]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      storageService.saveCustomer({
        id: customer?.id,
        name: name.trim(),
        phone: phone.trim() || undefined,
        source,
        preferences: preferences.trim() || undefined,
        notes: notes.trim() || undefined,
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
          {customer ? 'Edit Customer' : 'Add New Customer (Section 5)'}
        </h3>

        {error && (
          <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Customer Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Phone Number (+65... or 8/9 digits)
            </label>
            <input
              type="tel"
              placeholder="+6591234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            />
            {/* Duplicate phone warning */}
            {duplicateCustomer && (
              <div className="mt-1.5 flex items-start gap-1.5 text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-300 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Notice: Another customer <strong>{duplicateCustomer.name}</strong> has this same phone number. Section 5 specifies records are kept separate and not auto-merged.
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Enquiry Channel Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="referral">Word of Mouth / Referral</option>
              <option value="friend">Personal Friend / Family</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Dietary / Baking Preferences
            </label>
            <input
              type="text"
              placeholder="e.g. Likes extra dark blistered crust, allergic to walnuts"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Private Notes (Never sent to customer)
            </label>
            <textarea
              rows={2}
              placeholder="Internal notes, pickup habits..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2 font-bold uppercase text-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="touch-target flex-1 rounded-xl bg-[#526043] py-2 font-bold uppercase text-white hover:bg-[#3F4C33]"
            >
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Subcomponent: Edit Product Modal
const EditProductModal: React.FC<{
  product: Product | null;
  capacityGroups: any[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ product, capacityGroups, isOpen, onClose }) => {
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState<'core' | 'seasonal'>(product?.category || 'core');
  const [priceDollars, setPriceDollars] = useState(
    product ? (product.priceCents / 100).toFixed(2) : '12.00'
  );
  const [unitLabel, setUnitLabel] = useState(product?.unitLabel || 'loaf');
  const [capacityGroupId, setCapacityGroupId] = useState(
    product?.capacityGroupId || capacityGroups[0]?.id || ''
  );
  const [capacityUnits, setCapacityUnits] = useState(product?.capacityUnits ?? 1);
  const [description, setDescription] = useState(product?.description || '');
  const [active, setActive] = useState(product?.active ?? true);
  const [archived, setArchived] = useState(product?.archived ?? false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const priceCents = Math.round(parseFloat(priceDollars || '0') * 100);

    storageService.saveProduct({
      id: product?.id,
      name: name.trim(),
      category,
      priceCents,
      unitLabel,
      capacityGroupId,
      capacityUnits,
      description: description.trim() || undefined,
      active,
      archived,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl">
        <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
          {product ? 'Edit Product' : 'New Product (Snapshot ORD05)'}
        </h3>
        <p className="text-[11px] text-stone-500 mt-0.5">
          Note: Changing price here does not modify existing confirmed orders (ORD05).
        </p>

        <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Product Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
              >
                <option value="core">Core Item</option>
                <option value="seasonal">Seasonal Special</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Unit Price (SGD)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-stone-500 font-bold">S$</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  className="w-full rounded-xl border border-[#D3C7B6] bg-white pl-8 pr-3 py-2 font-mono-numbers font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Unit Label
              </label>
              <input
                type="text"
                placeholder="loaf, box, jar"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Capacity Units (CAP01)
              </label>
              <input
                type="number"
                min="0"
                value={capacityUnits}
                onChange={(e) => setCapacityUnits(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 font-mono-numbers"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Capacity Group
            </label>
            <select
              value={capacityGroupId}
              onChange={(e) => setCapacityGroupId(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            >
              {capacityGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Description / Inclusions
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded text-[#526043]"
              />
              <span>Active in order forms</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-500">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
                className="rounded text-stone-600"
              />
              <span>Archived</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2 font-bold uppercase text-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="touch-target flex-1 rounded-xl bg-[#526043] py-2 font-bold uppercase text-white hover:bg-[#3F4C33]"
            >
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
