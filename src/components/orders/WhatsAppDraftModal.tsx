/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * WhatsApp Message Draft Generator Modal (PRD Section 7, ORD01, A11)
 */

import React, { useState, useMemo } from 'react';
import { X, Copy, ExternalLink, MessageCircle, AlertTriangle, Check } from 'lucide-react';
import { BakeSession, BusinessSettings, Customer, Order } from '../../types';
import { generateOrderMessage, MessageTemplateKey } from '../../services/messaging';

interface WhatsAppDraftModalProps {
  order: Order;
  customer?: Customer;
  session?: BakeSession;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: MessageTemplateKey;
}

export const WhatsAppDraftModal: React.FC<WhatsAppDraftModalProps> = ({
  order,
  customer,
  session,
  settings,
  isOpen,
  onClose,
  initialTemplate = 'confirmation',
}) => {
  const [templateKey, setTemplateKey] = useState<MessageTemplateKey>(initialTemplate);
  const [copied, setCopied] = useState(false);

  const draftResult = useMemo(() => {
    return generateOrderMessage(templateKey, order, customer, session, settings);
  }, [templateKey, order, customer, session, settings]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftResult.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Unable to copy automatically. Please copy the text below manually.');
    }
  };

  const handleOpenWhatsApp = () => {
    if (draftResult.whatsappUrl) {
      window.open(draftResult.whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                WhatsApp Message Draft
              </h3>
              <p className="text-xs text-[#6B655F]">
                {customer?.name || 'Customer'} • Ref {order.displayReference}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { key: 'confirmation', label: 'Order Confirmation' },
            { key: 'pendingHold', label: 'Hold Request' },
            { key: 'paymentReminder', label: 'Payment Reminder' },
            { key: 'collectionReady', label: 'Collection Ready' },
            { key: 'sourdoughCareGuide', label: 'Care & Slicing Guide' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTemplateKey(t.key as MessageTemplateKey)}
              className={`touch-target px-3 py-1.5 rounded-lg whitespace-nowrap font-semibold transition-colors ${
                templateKey === t.key
                  ? 'bg-[#526043] text-white shadow-sm'
                  : 'bg-white border border-[#D3C7B6] text-[#4A4541] hover:bg-[#F2ECE1]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Missing fields warnings (ORD01) */}
        {draftResult.missingFields.length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-300 p-3 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Missing Information</p>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-amber-800">
                {draftResult.missingFields.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              {!draftResult.canOpenWhatsApp && (
                <p className="mt-1 text-[11px] font-semibold text-amber-900">
                  Direct WhatsApp link is disabled because no customer phone was provided. You can still copy the text.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Draft text area */}
        <div className="mt-3 flex-1 overflow-y-auto">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] mb-1">
            Generated Text (Verified Fields Snapshot)
          </label>
          <div className="w-full rounded-xl border border-[#D3C7B6] bg-white p-3.5 text-sm text-[#282624] whitespace-pre-wrap font-sans leading-relaxed min-h-[160px] max-h-[240px] overflow-y-auto select-text shadow-inner">
            {draftResult.text}
          </div>
        </div>

        {/* Compliance disclaimer */}
        <p className="mt-2 text-[11px] text-[#6B655F] italic">
          Disclaimer (PRD Section 7 & A11): Opening a draft does not prove delivery, receipt, or payment. The owner must send the message in WhatsApp and record payments manually.
        </p>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2 pt-2 border-t border-[#E4DDD3]">
          <button
            onClick={handleCopy}
            className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-[#4A4541] hover:bg-stone-100 flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Draft</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenWhatsApp}
            disabled={!draftResult.canOpenWhatsApp}
            className={`touch-target flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm flex items-center justify-center gap-1.5 transition-all ${
              draftResult.canOpenWhatsApp
                ? 'bg-[#25D366] hover:bg-[#1EBE5D] text-slate-900 font-bold active:scale-[0.98]'
                : 'bg-stone-300 cursor-not-allowed text-stone-500'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
