/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kharis Bake Operations Planner - Domain Types
 */

export type OrderStatus = 'draft' | 'pending' | 'confirmed' | 'collected' | 'declined' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'part_paid' | 'paid' | 'refund_due';
export type SessionStatus = 'open' | 'closed' | 'completed';
export type ContentStatus = 'idea' | 'planned' | 'ready' | 'published' | 'skipped';
export type ShotStatus = 'needed' | 'captured' | 'skipped';
export type ShotPhase = 'ingredient_prep' | 'folding' | 'shaping' | 'oven_unload' | 'cooling' | 'slicing';
export type ShotOrientation = 'vertical_9_16' | 'horizontal_16_9' | 'square_1_1';
export type PaymentMethod = 'paynow' | 'bank_transfer' | 'cash' | 'other';
export type ChannelType = 'instagram' | 'tiktok' | 'whatsapp' | 'newsletter';
export type FormatType = 'reels' | 'carousel' | 'static' | 'story';

export interface Customer {
  id: string;
  ownerId: string;
  name: string;
  phone?: string; // international E.164 or Singapore local +65
  source: string; // 'whatsapp' | 'instagram' | 'referral' | 'friend'
  preferences?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapacityGroup {
  id: string;
  name: string;
  defaultLimit: number;
  unitLabel: string;
  description?: string;
}

export interface Product {
  id: string;
  ownerId: string;
  name: string;
  category: 'core' | 'seasonal';
  active: boolean;
  priceCents: number; // Stored in integer cents (e.g. S$8.00 = 800)
  unitLabel: string; // 'loaf', 'box', 'piece'
  capacityGroupId: string;
  capacityUnits: number; // e.g. 1 loaf = 1 capacity unit
  description?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  capacityUnitsSnapshot: number;
  capacityGroupIdSnapshot: string;
}

export interface Payment {
  id: string;
  orderId: string;
  signedAmountCents: number; // Positive for received payment, negative for refund
  receivedAt: string;
  method: PaymentMethod;
  note?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  ownerId: string;
  displayReference: string; // e.g. KB-2610-001
  customerId: string;
  bakeSessionId: string;
  status: OrderStatus;
  requestSource: 'whatsapp' | 'instagram' | 'referral' | 'other';
  holdExpiresAt?: string; // ISO string for pending holds (default 24h)
  discountCents: number;
  totalCents: number; // Derived: sum(quantity * unitPriceCents) - discountCents
  collectionWindow?: string; // e.g. "14:00 - 16:00"
  notes?: string;
  revision: number; // For optimistic concurrency check
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: Payment[];
}

export interface BakeSession {
  id: string;
  ownerId: string;
  bakeDate: string; // 'YYYY-MM-DD'
  orderCutoffAt: string; // ISO string
  collectionStartAt: string; // ISO string
  collectionEndAt: string; // ISO string
  status: SessionStatus;
  notes?: string;
  groupLimits: Record<string, number>; // capacityGroupId -> limit number
  createdAt: string;
  updatedAt: string;
}

export interface PrepTask {
  id: string;
  ownerId: string;
  bakeSessionId: string;
  description: string;
  phase?: string;
  dueAt?: string;
  completedAt?: string;
  sortOrder: number;
}

export interface ContentItem {
  id: string;
  ownerId: string;
  title: string;
  publicationDate: string; // 'YYYY-MM-DD'
  channel: ChannelType;
  format: FormatType;
  productIds: string[];
  theme: string;
  hook?: string;
  captionNotes?: string;
  status: ContentStatus;
  importKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shot {
  id: string;
  ownerId: string;
  contentItemId: string;
  bakeSessionId?: string;
  description: string;
  phase: ShotPhase;
  durationMinutes: number;
  orientation: ShotOrientation;
  setup: string;
  props?: string;
  priority: 'high' | 'normal' | 'low';
  status: ShotStatus;
  assetLink?: string;
  requiresPersonalLoaf?: boolean;
  personalLoafAcknowledged?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettings {
  ownerName: string;
  businessName: string;
  currency: string; // 'SGD'
  timezone: string; // 'Asia/Singapore'
  defaultCollectionAddress: string;
  defaultHoldHours: number; // 24
  whatsappTemplates: {
    confirmation: string;
    pendingHold: string;
    paymentReminder: string;
    collectionReady: string;
    sourdoughCareGuide: string;
  };
  capacityGroups: CapacityGroup[];
  lastBackupAt?: string;
}

export interface CapacityCheckResult {
  allowed: boolean;
  groupId: string;
  groupName: string;
  limit: number;
  confirmedDemand: number;
  unexpiredHolds: number;
  available: number;
  requested: number;
  reason?: string;
}

export interface SessionCapacitySummary {
  groupId: string;
  groupName: string;
  unitLabel: string;
  limit: number;
  confirmedDemand: number;
  unexpiredHolds: number;
  available: number;
  isAtCapacity: boolean;
}

export interface ConsolidatedProductTotal {
  productId: string;
  productName: string;
  unitLabel: string;
  confirmedQuantity: number;
  heldQuantity: number;
  capacityGroupId: string;
  capacityUnitsTotal: number;
  orderCount: number;
}
