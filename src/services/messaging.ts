/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * WhatsApp Message Draft Generator (PRD Section 7, ORD01, A11)
 */

import { BakeSession, BusinessSettings, Customer, Order } from '../types';
import { calculateOrderBalance, formatCents, formatDate } from './formatters';

export type MessageTemplateKey =
  | 'confirmation'
  | 'pendingHold'
  | 'paymentReminder'
  | 'collectionReady'
  | 'sourdoughCareGuide';

export interface DraftMessageResult {
  text: string;
  customerPhone?: string;
  whatsappUrl?: string;
  canOpenWhatsApp: boolean;
  missingFields: string[];
}

export function generateOrderMessage(
  templateKey: MessageTemplateKey,
  order: Order,
  customer: Customer | undefined,
  session: BakeSession | undefined,
  settings: BusinessSettings
): DraftMessageResult {
  const missingFields: string[] = [];

  if (!customer?.name) {
    missingFields.push('Customer Name');
  }

  const cleanPhone = customer?.phone ? customer.phone.replace(/[^0-9+]/g, '') : '';
  if (!cleanPhone) {
    missingFields.push('Customer Phone (required for direct WhatsApp link)');
  }

  if (!session?.bakeDate) {
    missingFields.push('Bake Date');
  }

  const { totalPaidCents, balanceCents } = calculateOrderBalance(order.totalCents, order.payments);

  // Generate order summary bullet list
  const summaryLines = order.items.map(
    (item) => `• ${item.quantity}x ${item.productNameSnapshot} (${formatCents(item.quantity * item.unitPriceCents)})`
  );
  if (order.discountCents > 0) {
    summaryLines.push(`• Discount: -${formatCents(order.discountCents)}`);
  }
  const orderSummary = summaryLines.join('\n');

  // Format hold expiry
  let holdExpiryStr = '24 hours';
  if (order.holdExpiresAt) {
    try {
      const exp = new Date(order.holdExpiresAt);
      holdExpiryStr = exp.toLocaleTimeString('en-SG', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      holdExpiryStr = order.holdExpiresAt;
    }
  }

  const template = settings.whatsappTemplates[templateKey] || '';

  // Variable replacement
  let text = template
    .replace(/{{customer_name}}/g, customer?.name || '[CUSTOMER NAME MISSING]')
    .replace(/{{order_ref}}/g, order.displayReference || order.id)
    .replace(/{{bake_date}}/g, session ? formatDate(session.bakeDate) : '[BAKE DATE MISSING]')
    .replace(/{{order_summary}}/g, orderSummary)
    .replace(/{{total_amount}}/g, formatCents(order.totalCents))
    .replace(/{{amount_paid}}/g, formatCents(totalPaidCents))
    .replace(/{{balance_due}}/g, formatCents(balanceCents))
    .replace(/{{collection_window}}/g, order.collectionWindow || '14:00 – 17:00')
    .replace(/{{collection_address}}/g, settings.defaultCollectionAddress || 'Tiong Bahru Studio')
    .replace(/{{hold_hours}}/g, (settings.defaultHoldHours || 24).toString())
    .replace(/{{hold_expiry}}/g, holdExpiryStr);

  const canOpenWhatsApp = cleanPhone.length > 0;
  let whatsappUrl: string | undefined = undefined;

  if (canOpenWhatsApp) {
    // Internationalize phone format if Singapore local without +
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('8') || formattedPhone.startsWith('9')) {
      formattedPhone = '65' + formattedPhone;
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  }

  return {
    text,
    customerPhone: cleanPhone,
    whatsappUrl,
    canOpenWhatsApp,
    missingFields,
  };
}
