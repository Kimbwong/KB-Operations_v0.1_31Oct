/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Data Access Layer (DAL) for Kharis Bake Operations Planner
 * Stage A Prototype with Local Demonstration Storage and Reactive Subscriptions
 */

import {
  BakeSession,
  BusinessSettings,
  CapacityGroup,
  ContentItem,
  Customer,
  Order,
  Payment,
  PrepTask,
  Product,
  Shot,
} from '../types';
import { checkOrderCapacity } from './capacity';
import { calculateOrderBalance } from './formatters';
import {
  INITIAL_BAKE_SESSIONS,
  INITIAL_BUSINESS_SETTINGS,
  INITIAL_CAPACITY_GROUPS,
  INITIAL_CUSTOMERS,
  INITIAL_CONTENT_ITEMS,
  INITIAL_ORDERS,
  INITIAL_PREP_TASKS,
  INITIAL_PRODUCTS,
  INITIAL_SHOTS,
  OWNER_ID,
} from './seedData';

const STORAGE_KEY_PREFIX = 'kharis_bake_stage_a_';

export interface AppState {
  customers: Customer[];
  products: Product[];
  bakeSessions: BakeSession[];
  orders: Order[];
  prepTasks: PrepTask[];
  contentItems: ContentItem[];
  shots: Shot[];
  settings: BusinessSettings;
  capacityGroups: CapacityGroup[];
}

type Listener = (state: AppState) => void;

class StorageService {
  private state: AppState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = this.loadFromStorage();
  }

  private loadFromStorage(): AppState {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}state_v1`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.orders && parsed.bakeSessions && parsed.products) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial seed data.', e);
    }
    return this.getInitialSeedState();
  }

  public getInitialSeedState(): AppState {
    return {
      customers: JSON.parse(JSON.stringify(INITIAL_CUSTOMERS)),
      products: JSON.parse(JSON.stringify(INITIAL_PRODUCTS)),
      bakeSessions: JSON.parse(JSON.stringify(INITIAL_BAKE_SESSIONS)),
      orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
      prepTasks: JSON.parse(JSON.stringify(INITIAL_PREP_TASKS)),
      contentItems: JSON.parse(JSON.stringify(INITIAL_CONTENT_ITEMS)),
      shots: JSON.parse(JSON.stringify(INITIAL_SHOTS)),
      settings: JSON.parse(JSON.stringify(INITIAL_BUSINESS_SETTINGS)),
      capacityGroups: JSON.parse(JSON.stringify(INITIAL_CAPACITY_GROUPS)),
    };
  }

  private persist() {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}state_v1`, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error in subscriber listener:', err);
      }
    });
  }

  public getState(): AppState {
    // Return immutable snapshot
    return JSON.parse(JSON.stringify(this.state));
  }

  public resetToSampleData(): void {
    this.state = this.getInitialSeedState();
    this.persist();
  }

  // ===================== CUSTOMERS =====================
  public getCustomers(): Customer[] {
    return [...this.state.customers];
  }

  public checkDuplicatePhone(phone: string, excludeCustomerId?: string): Customer | undefined {
    if (!phone) return undefined;
    const cleanPhone = phone.replace(/[\s-]/g, '');
    return this.state.customers.find(
      (c) => c.phone && c.phone.replace(/[\s-]/g, '') === cleanPhone && c.id !== excludeCustomerId
    );
  }

  public saveCustomer(customer: Omit<Customer, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }): Customer {
    const now = new Date().toISOString();
    let saved: Customer;

    if (customer.id) {
      const idx = this.state.customers.findIndex((c) => c.id === customer.id);
      if (idx === -1) throw new Error('Customer not found');
      saved = {
        ...this.state.customers[idx],
        ...customer,
        id: customer.id,
        updatedAt: now,
      };
      this.state.customers[idx] = saved;
    } else {
      saved = {
        ...customer,
        id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ownerId: OWNER_ID,
        createdAt: now,
        updatedAt: now,
      };
      this.state.customers.unshift(saved);
    }

    this.persist();
    return saved;
  }

  // ===================== PRODUCTS =====================
  public getProducts(): Product[] {
    return [...this.state.products];
  }

  public saveProduct(prod: Omit<Product, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }): Product {
    const now = new Date().toISOString();
    let saved: Product;

    if (prod.id) {
      const idx = this.state.products.findIndex((p) => p.id === prod.id);
      if (idx === -1) throw new Error('Product not found');
      saved = {
        ...this.state.products[idx],
        ...prod,
        id: prod.id,
        updatedAt: now,
      };
      this.state.products[idx] = saved;
    } else {
      saved = {
        ...prod,
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ownerId: OWNER_ID,
        createdAt: now,
        updatedAt: now,
      };
      this.state.products.push(saved);
    }

    this.persist();
    return saved;
  }

  // ===================== BAKE SESSIONS =====================
  public getBakeSessions(): BakeSession[] {
    return [...this.state.bakeSessions].sort(
      (a, b) => new Date(a.bakeDate).getTime() - new Date(b.bakeDate).getTime()
    );
  }

  public saveBakeSession(
    sessionData: Omit<BakeSession, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): BakeSession {
    const now = new Date().toISOString();
    let saved: BakeSession;

    if (sessionData.id) {
      const idx = this.state.bakeSessions.findIndex((s) => s.id === sessionData.id);
      if (idx === -1) throw new Error('Bake session not found');

      // CAP05: Reducing limits below committed demand is blocked
      const existing = this.state.bakeSessions[idx];
      const sessionOrders = this.state.orders.filter(
        (o) =>
          o.bakeSessionId === existing.id &&
          (o.status === 'confirmed' || o.status === 'collected')
      );

      for (const [grpId, newLimit] of Object.entries(sessionData.groupLimits)) {
        let committed = 0;
        for (const ord of sessionOrders) {
          for (const item of ord.items) {
            if (item.capacityGroupIdSnapshot === grpId) {
              committed += (item.capacityUnitsSnapshot || 0) * item.quantity;
            }
          }
        }
        if (newLimit < committed) {
          throw new Error(
            `Cannot reduce limit for group ${grpId} to ${newLimit}. Committed confirmed orders require at least ${committed}.`
          );
        }
      }

      saved = {
        ...existing,
        ...sessionData,
        id: sessionData.id,
        updatedAt: now,
      };
      this.state.bakeSessions[idx] = saved;
    } else {
      saved = {
        ...sessionData,
        id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ownerId: OWNER_ID,
        createdAt: now,
        updatedAt: now,
      };
      this.state.bakeSessions.push(saved);
    }

    this.persist();
    return saved;
  }

  public getUncollectedOrdersCount(sessionId: string): number {
    return this.state.orders.filter(
      (o) => o.bakeSessionId === sessionId && o.status === 'confirmed'
    ).length;
  }

  // ===================== ORDERS =====================
  public getOrders(): Order[] {
    return [...this.state.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public checkSimilarExistingOrder(
    customerId: string,
    bakeSessionId: string,
    excludeOrderId?: string
  ): Order | undefined {
    return this.state.orders.find(
      (o) =>
        o.customerId === customerId &&
        o.bakeSessionId === bakeSessionId &&
        o.id !== excludeOrderId &&
        (o.status === 'confirmed' || o.status === 'pending' || o.status === 'draft')
    );
  }

  /**
   * Generates a stable human reference KB-YYMM-XXX
   */
  public generateNextReference(): string {
    const d = new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `KB-${yy}${mm}-`;

    const existingRefs = this.state.orders
      .map((o) => o.displayReference)
      .filter((ref) => ref && ref.startsWith(prefix));

    let maxNum = 0;
    for (const ref of existingRefs) {
      const parts = ref.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }

    return `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;
  }

  /**
   * Saves an order with atomic capacity checks (CAP04) and revision protection (ORD05)
   */
  public saveOrder(
    orderData: Omit<Partial<Order>, 'items'> & {
      customerId: string;
      bakeSessionId: string;
      items: { productId: string; quantity: number }[];
      status: Order['status'];
    },
    ignoreCapacityCheck = false
  ): Order {
    const now = new Date();
    const nowIso = now.toISOString();

    const session = this.state.bakeSessions.find((s) => s.id === orderData.bakeSessionId);
    if (!session) throw new Error('Bake session does not exist.');

    // Snapshot product items with current prices & capacity values (ORD05)
    const processedItems: Order['items'] = orderData.items.map((itemInput, idx) => {
      const product = this.state.products.find((p) => p.id === itemInput.productId);
      if (!product) throw new Error(`Product ${itemInput.productId} not found`);
      if (itemInput.quantity <= 0) throw new Error('Quantity must be a positive whole number (ORD01)');

      return {
        id: `item_${Date.now()}_${idx}`,
        orderId: orderData.id || '',
        productId: product.id,
        productNameSnapshot: product.name,
        quantity: Math.floor(itemInput.quantity),
        unitPriceCents: product.priceCents,
        capacityUnitsSnapshot: product.capacityUnits,
        capacityGroupIdSnapshot: product.capacityGroupId,
      };
    });

    if (processedItems.length === 0) {
      throw new Error('At least one active product item is required (ORD01).');
    }

    // Calculate total (ORD04)
    const subtotalCents = processedItems.reduce(
      (sum, it) => sum + it.quantity * it.unitPriceCents,
      0
    );
    const discountCents = Math.max(0, orderData.discountCents || 0);
    if (discountCents > subtotalCents) {
      throw new Error('Discount cannot exceed subtotal (ORD04).');
    }
    const totalCents = subtotalCents - discountCents;

    let targetOrder: Order;

    if (orderData.id) {
      const existingIdx = this.state.orders.findIndex((o) => o.id === orderData.id);
      if (existingIdx === -1) throw new Error('Order not found');
      const existing = this.state.orders[existingIdx];

      // Optimistic concurrency check (Section 6)
      if (orderData.revision !== undefined && orderData.revision !== existing.revision) {
        throw new Error(
          'Stale edit detected: This order was updated elsewhere. Please reload the order before saving.'
        );
      }

      targetOrder = {
        ...existing,
        ...orderData,
        items: processedItems,
        totalCents,
        discountCents,
        revision: (existing.revision || 1) + 1,
        updatedAt: nowIso,
      };

      // Set or update hold expiry if status is pending
      if (targetOrder.status === 'pending' && !targetOrder.holdExpiresAt) {
        const holdHours = this.state.settings.defaultHoldHours || 24;
        const expiry = new Date(now.getTime() + holdHours * 60 * 60 * 1000);
        targetOrder.holdExpiresAt = expiry.toISOString();
      }

      // Check capacity atomically
      if (!ignoreCapacityCheck) {
        const capCheck = checkOrderCapacity(
          session,
          this.state.orders,
          targetOrder,
          targetOrder.status,
          this.state.capacityGroups,
          now
        );
        if (!capCheck.allowed) {
          throw new Error(capCheck.blockReason || 'Capacity check failed.');
        }
      }

      this.state.orders[existingIdx] = targetOrder;
    } else {
      const newId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      processedItems.forEach((it) => (it.orderId = newId));

      let holdExpiresAt: string | undefined = undefined;
      if (orderData.status === 'pending') {
        const holdHours = this.state.settings.defaultHoldHours || 24;
        const expiry = new Date(now.getTime() + holdHours * 60 * 60 * 1000);
        holdExpiresAt = expiry.toISOString();
      }

      targetOrder = {
        id: newId,
        ownerId: OWNER_ID,
        displayReference: orderData.displayReference || this.generateNextReference(),
        customerId: orderData.customerId,
        bakeSessionId: orderData.bakeSessionId,
        status: orderData.status || 'draft',
        requestSource: orderData.requestSource || 'whatsapp',
        holdExpiresAt,
        discountCents,
        totalCents,
        collectionWindow: orderData.collectionWindow || '14:00 – 16:00',
        notes: orderData.notes || '',
        revision: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
        items: processedItems,
        payments: [],
      };

      // Capacity check
      if (!ignoreCapacityCheck) {
        const capCheck = checkOrderCapacity(
          session,
          this.state.orders,
          targetOrder,
          targetOrder.status,
          this.state.capacityGroups,
          now
        );
        if (!capCheck.allowed) {
          throw new Error(capCheck.blockReason || 'Capacity check failed.');
        }
      }

      this.state.orders.unshift(targetOrder);
    }

    this.persist();
    return targetOrder;
  }

  public recordPayment(
    orderId: string,
    paymentInput: { signedAmountCents: number; method: Payment['method']; note?: string; receivedAt?: string }
  ): Payment {
    const orderIdx = this.state.orders.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) throw new Error('Order not found');

    const order = this.state.orders[orderIdx];
    const nowIso = new Date().toISOString();

    const payment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderId,
      signedAmountCents: Math.round(paymentInput.signedAmountCents),
      receivedAt: paymentInput.receivedAt || nowIso,
      method: paymentInput.method,
      note: paymentInput.note || '',
      createdAt: nowIso,
    };

    order.payments.push(payment);
    order.revision = (order.revision || 1) + 1;
    order.updatedAt = nowIso;

    this.persist();
    return payment;
  }

  public updateOrderStatus(orderId: string, newStatus: Order['status']): Order {
    const orderIdx = this.state.orders.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) throw new Error('Order not found');

    const order = this.state.orders[orderIdx];
    const session = this.state.bakeSessions.find((s) => s.id === order.bakeSessionId);
    if (!session) throw new Error('Bake session not found');

    // If moving to confirmed or pending, verify capacity (CAP04)
    if (newStatus === 'confirmed' || newStatus === 'pending') {
      const capCheck = checkOrderCapacity(
        session,
        this.state.orders,
        order,
        newStatus,
        this.state.capacityGroups,
        new Date()
      );
      if (!capCheck.allowed) {
        throw new Error(capCheck.blockReason || 'Capacity check failed');
      }
    }

    order.status = newStatus;
    order.revision = (order.revision || 1) + 1;
    order.updatedAt = new Date().toISOString();

    this.persist();
    return order;
  }

  // ===================== PREP TASKS =====================
  public getPrepTasks(sessionId?: string): PrepTask[] {
    if (!sessionId) return [...this.state.prepTasks];
    return this.state.prepTasks
      .filter((t) => t.bakeSessionId === sessionId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public togglePrepTask(taskId: string): PrepTask {
    const idx = this.state.prepTasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error('Task not found');

    const task = this.state.prepTasks[idx];
    task.completedAt = task.completedAt ? undefined : new Date().toISOString();

    this.persist();
    return task;
  }

  public addPrepTask(task: Omit<PrepTask, 'id' | 'ownerId'>): PrepTask {
    const newTask: PrepTask = {
      ...task,
      id: `prep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ownerId: OWNER_ID,
    };
    this.state.prepTasks.push(newTask);
    this.persist();
    return newTask;
  }

  // ===================== CONTENT & SHOTS =====================
  public getContentItems(): ContentItem[] {
    return [...this.state.contentItems].sort(
      (a, b) => new Date(a.publicationDate).getTime() - new Date(b.publicationDate).getTime()
    );
  }

  public saveContentItem(itemData: Omit<ContentItem, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }): ContentItem {
    const now = new Date().toISOString();
    let saved: ContentItem;

    if (itemData.id) {
      const idx = this.state.contentItems.findIndex((c) => c.id === itemData.id);
      if (idx === -1) throw new Error('Content item not found');
      saved = {
        ...this.state.contentItems[idx],
        ...itemData,
        id: itemData.id,
        updatedAt: now,
      };
      this.state.contentItems[idx] = saved;
    } else {
      saved = {
        ...itemData,
        id: `cont_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ownerId: OWNER_ID,
        createdAt: now,
        updatedAt: now,
      };
      this.state.contentItems.unshift(saved);
    }

    this.persist();
    return saved;
  }

  public getShots(contentItemId?: string, bakeSessionId?: string): Shot[] {
    let shots = [...this.state.shots];
    if (contentItemId) {
      shots = shots.filter((s) => s.contentItemId === contentItemId);
    }
    if (bakeSessionId) {
      shots = shots.filter((s) => s.bakeSessionId === bakeSessionId);
    }
    return shots;
  }

  public saveShot(shotData: Omit<Shot, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }): Shot {
    const now = new Date().toISOString();
    let saved: Shot;

    if (shotData.id) {
      const idx = this.state.shots.findIndex((s) => s.id === shotData.id);
      if (idx === -1) throw new Error('Shot not found');
      saved = {
        ...this.state.shots[idx],
        ...shotData,
        id: shotData.id,
        updatedAt: now,
      };
      this.state.shots[idx] = saved;
    } else {
      saved = {
        ...shotData,
        id: `shot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ownerId: OWNER_ID,
        createdAt: now,
        updatedAt: now,
      };
      this.state.shots.push(saved);
    }

    this.persist();
    return saved;
  }

  public updateShotStatus(shotId: string, status: Shot['status']): Shot {
    const idx = this.state.shots.findIndex((s) => s.id === shotId);
    if (idx === -1) throw new Error('Shot not found');

    const shot = this.state.shots[idx];
    shot.status = status;
    shot.updatedAt = new Date().toISOString();

    // Practical design rule: Capturing a shot does NOT mark post as published (CON02, A5)
    this.persist();
    return shot;
  }

  // ===================== SETTINGS & RESTORE =====================
  public getSettings(): BusinessSettings {
    return { ...this.state.settings };
  }

  public saveSettings(settings: Partial<BusinessSettings>): BusinessSettings {
    this.state.settings = {
      ...this.state.settings,
      ...settings,
    };
    if (settings.capacityGroups) {
      this.state.capacityGroups = settings.capacityGroups;
    }
    this.persist();
    return this.state.settings;
  }

  public restoreFromBackup(backupData: AppState): { success: boolean; message: string } {
    if (!backupData || !Array.isArray(backupData.orders) || !Array.isArray(backupData.products)) {
      return { success: false, message: 'Invalid backup structure: missing orders or products arrays.' };
    }

    // Safety update
    this.state = {
      customers: backupData.customers || [],
      products: backupData.products || [],
      bakeSessions: backupData.bakeSessions || [],
      orders: backupData.orders || [],
      prepTasks: backupData.prepTasks || [],
      contentItems: backupData.contentItems || [],
      shots: backupData.shots || [],
      settings: backupData.settings || INITIAL_BUSINESS_SETTINGS,
      capacityGroups: backupData.capacityGroups || INITIAL_CAPACITY_GROUPS,
    };

    this.state.settings.lastBackupAt = new Date().toISOString();
    this.persist();
    return { success: true, message: 'Workspace restored successfully.' };
  }
}

export const storageService = new StorageService();
