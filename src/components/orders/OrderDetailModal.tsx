/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Order Detail & Management Modal (ORD01 - ORD06, CAP01 - CAP05)
 */

import React, { useState } from 'react';
import {
  X,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  PackageCheck,
  AlertOctagon,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { BakeSession, BusinessSettings, Customer, Order } from '../../types';
import { calculateOrderBalance, formatCents, formatDate, formatDateTime } from '../../services/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { PaymentRecordModal } from './PaymentRecordModal';
import { WhatsAppDraftModal } from './WhatsAppDraftModal';
import { storageService } from '../../services/storage';

interface OrderDetailModalProps {
  order: Order;
  customer?: Customer;
  session?: BakeSession;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  customer,
  session,
  settings,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const { totalPaidCents, balanceCents, paymentStatus } = calculateOrderBalance(
    order.totalCents,
    order.payments
  );

  const handleUpdateStatus = (newStatus: Order['status']) => {
    setError(null);
    try {
      storageService.updateOrderStatus(order.id, newStatus);
      onOrderUpdated();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleReopenCollected = () => {
    if (
      window.confirm(
        'Correction Action (ORD02): Reopening a collected order requires explicit confirmation. Mark this order as Confirmed again?'
      )
    ) {
      handleUpdateStatus('confirmed');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-xl rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-heading text-xl font-bold text-[#282624]">
                  {order.displayReference}
                </h3>
                <StatusBadge type="order" status={order.status} />
                <StatusBadge type="payment" status={paymentStatus} />
              </div>
              <p className="text-xs text-[#6B655F]">
                Bake Date: {session ? formatDate(session.bakeDate) : 'Unknown'} • Rev #{order.revision}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800">
                {error}
              </div>
            )}

            {/* Customer & Collection Window */}
            <div className="rounded-xl border border-[#D3C7B6] bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#282624]">
                    {customer?.name || 'Unknown Customer'}
                  </h4>
                  <p className="text-xs text-[#6B655F]">{customer?.phone || 'No phone recorded'}</p>
                  {customer?.preferences && (
                    <p className="mt-1 text-xs text-stone-700 bg-stone-50 p-2 rounded-lg border border-stone-200">
                      <strong>Customer note:</strong> {customer.preferences}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-stone-500">
                    Collection Window
                  </span>
                  <p className="text-xs font-semibold text-[#282624]">
                    {order.collectionWindow || '14:00 – 17:00'}
                  </p>
                </div>
              </div>

              {order.notes && (
                <div className="mt-2.5 pt-2 border-t border-[#E4DDD3] text-xs text-stone-600">
                  <span className="font-semibold text-stone-700">Internal Order Note: </span>
                  {order.notes}
                </div>
              )}
            </div>

            {/* Items Summary (Snapshotted ORD05) */}
            <div className="rounded-xl border border-[#D3C7B6] bg-white p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-2">
                Order Items (Snapshotted at Confirmation)
              </h4>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-none text-sm"
                  >
                    <div>
                      <span className="font-semibold text-[#282624]">{item.productNameSnapshot}</span>
                      <span className="text-xs text-[#6B655F] ml-2">
                        {item.quantity} × {formatCents(item.unitPriceCents)}
                      </span>
                    </div>
                    <span className="font-bold font-mono-numbers text-[#282624]">
                      {formatCents(item.quantity * item.unitPriceCents)}
                    </span>
                  </div>
                ))}

                {order.discountCents > 0 && (
                  <div className="flex items-center justify-between pt-1 text-xs text-rose-700 font-semibold">
                    <span>Discount:</span>
                    <span>-{formatCents(order.discountCents)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#E4DDD3] font-bold text-base text-[#282624]">
                  <span>Total:</span>
                  <span className="font-mono-numbers text-[#526043]">
                    {formatCents(order.totalCents)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payments & Balance */}
            <div className="rounded-xl border border-[#D3C7B6] bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B655F]">
                  Manual Payments (ORD03)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="text-xs font-semibold text-[#526043] hover:underline flex items-center gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>+ Record Payment</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E4DDD3] text-xs mb-3">
                <div>
                  <span className="text-stone-500">Paid to date:</span>
                  <p className="font-bold font-mono-numbers text-[#282624]">
                    {formatCents(totalPaidCents)}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">Remaining Balance:</span>
                  <p
                    className={`font-bold font-mono-numbers ${
                      balanceCents > 0
                        ? 'text-rose-700'
                        : balanceCents < 0
                        ? 'text-purple-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {formatCents(balanceCents)}
                  </p>
                </div>
              </div>

              {order.payments.length === 0 ? (
                <p className="text-xs text-stone-500 italic">No manual payments recorded yet.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {order.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200"
                    >
                      <div>
                        <span className="font-semibold uppercase text-[11px] text-[#526043]">
                          {p.method}
                        </span>
                        <span className="text-stone-500 text-[11px] ml-2">
                          {formatDateTime(p.receivedAt)}
                        </span>
                        {p.note && <p className="text-stone-600 text-[11px] mt-0.5">{p.note}</p>}
                      </div>
                      <span
                        className={`font-bold font-mono-numbers ${
                          p.signedAmountCents < 0 ? 'text-rose-700' : 'text-emerald-800'
                        }`}
                      >
                        {formatCents(p.signedAmountCents)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="mt-4 pt-3 border-t border-[#E4DDD3] space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(true)}
                className="touch-target flex-1 rounded-xl border border-[#25D366] bg-emerald-50 text-emerald-900 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>WhatsApp Draft</span>
              </button>

              {order.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('collected')}
                  className="touch-target flex-1 rounded-xl bg-[#526043] text-white py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#3F4C33] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Mark Collected</span>
                </button>
              )}

              {order.status === 'collected' && (
                <button
                  type="button"
                  onClick={handleReopenCollected}
                  className="touch-target flex-1 rounded-xl border border-stone-300 bg-white text-stone-700 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-stone-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Correct / Reopen</span>
                </button>
              )}

              {(order.status === 'draft' || order.status === 'pending') && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('confirmed')}
                  className="touch-target flex-1 rounded-xl bg-[#526043] text-white py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#3F4C33] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Order</span>
                </button>
              )}
            </div>

            {order.status !== 'cancelled' && order.status !== 'declined' && (
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Cancel this order? This will release reserved capacity once (CAP05).')) {
                      handleUpdateStatus('cancelled');
                    }
                  }}
                  className="text-stone-500 hover:text-rose-700 py-1 px-2"
                >
                  Cancel Order (Release Capacity)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentRecordModal
          order={order}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSaved={onOrderUpdated}
          suggestedAmountCents={balanceCents > 0 ? balanceCents : 0}
        />
      )}

      {showWhatsAppModal && (
        <WhatsAppDraftModal
          order={order}
          customer={customer}
          session={session}
          settings={settings}
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
    </>
  );
};
