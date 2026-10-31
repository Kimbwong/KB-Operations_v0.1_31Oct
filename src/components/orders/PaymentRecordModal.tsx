/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Payment Recording Modal (ORD03, ORD04)
 */

import React, { useState } from 'react';
import { X, DollarSign, Check } from 'lucide-react';
import { Order, PaymentMethod } from '../../types';
import { formatCents, parseDollarsToCents } from '../../services/formatters';
import { storageService } from '../../services/storage';

interface PaymentRecordModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSaved: () => void;
  suggestedAmountCents?: number;
}

export const PaymentRecordModal: React.FC<PaymentRecordModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentSaved,
  suggestedAmountCents = 0,
}) => {
  const [isRefund, setIsRefund] = useState(false);
  const [amountInput, setAmountInput] = useState<string>(
    suggestedAmountCents > 0 ? (suggestedAmountCents / 100).toFixed(2) : '0.00'
  );
  const [method, setMethod] = useState<PaymentMethod>('paynow');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedCents = parseDollarsToCents(amountInput);
    if (parsedCents <= 0) {
      setError('Please enter a positive amount in dollars/cents.');
      return;
    }

    const finalSignedCents = isRefund ? -parsedCents : parsedCents;

    try {
      storageService.recordPayment(order.id, {
        signedAmountCents: finalSignedCents,
        method,
        note: note.trim() || undefined,
        receivedAt: new Date().toISOString(),
      });
      onPaymentSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
          <div>
            <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
              {isRefund ? 'Issue Refund Record' : 'Record Manual Payment'}
            </h3>
            <p className="text-xs text-[#6B655F]">
              Order {order.displayReference} • Total {formatCents(order.totalCents)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Toggle Payment / Refund */}
          <div className="flex rounded-lg border border-[#D3C7B6] p-1 bg-[#F4EFE6]">
            <button
              type="button"
              onClick={() => setIsRefund(false)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                !isRefund ? 'bg-white text-[#282624] shadow-sm' : 'text-[#6B655F]'
              }`}
            >
              Payment Received
            </button>
            <button
              type="button"
              onClick={() => setIsRefund(true)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                isRefund ? 'bg-rose-600 text-white shadow-sm' : 'text-[#6B655F]'
              }`}
            >
              Negative / Refund
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Amount (SGD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-[#6B655F]">
                {isRefund ? '-S$' : 'S$'}
              </span>
              <input
                type="number"
                step="0.10"
                min="0.10"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white pl-12 pr-4 py-2.5 text-base font-bold text-[#282624] focus:border-[#526043] focus:ring-1 focus:ring-[#526043]"
              />
            </div>
            {suggestedAmountCents > 0 && !isRefund && (
              <button
                type="button"
                onClick={() => setAmountInput((suggestedAmountCents / 100).toFixed(2))}
                className="mt-1 text-xs text-[#526043] font-semibold hover:underline"
              >
                Set to remaining balance ({formatCents(suggestedAmountCents)})
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-sm text-[#282624] focus:border-[#526043]"
            >
              <option value="paynow">PayNow (UEN / Mobile)</option>
              <option value="bank_transfer">Bank Transfer (FAST)</option>
              <option value="cash">Cash on Collection</option>
              <option value="other">Other / Store Credit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Reference / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. PayNow Ref #9182, verified in bank app"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-sm text-[#282624] focus:border-[#526043]"
            />
            <p className="mt-1 text-[11px] text-[#6B655F]">
              ORD03 Rule: Never infer payment receipt from a message alone; manually record once verified in your account.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-[#6B655F] hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="touch-target flex-1 rounded-xl bg-[#526043] py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#3F4C33] shadow-sm flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
