/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kharis Bake Capacity Engine (CAP01 - CAP05)
 */

import {
  BakeSession,
  CapacityCheckResult,
  CapacityGroup,
  ConsolidatedProductTotal,
  Order,
  Product,
  SessionCapacitySummary,
} from '../types';

/**
 * Checks if a pending request hold has expired based on current timestamp
 */
export function isHoldExpired(holdExpiresAt?: string, now = new Date()): boolean {
  if (!holdExpiresAt) return true;
  const expiry = new Date(holdExpiresAt);
  if (isNaN(expiry.getTime())) return true;
  return now.getTime() > expiry.getTime();
}

/**
 * Calculates current confirmed and held capacity usage for a session and capacity group.
 * Expired pending holds are automatically excluded (CAP02/CAP03).
 */
export function getSessionGroupUsage(
  session: BakeSession,
  orders: Order[],
  groupId: string,
  now = new Date()
): { confirmedDemand: number; unexpiredHolds: number; limit: number; available: number } {
  const sessionOrders = orders.filter((o) => o.bakeSessionId === session.id);
  const limit = session.groupLimits[groupId] ?? 0;

  let confirmedDemand = 0;
  let unexpiredHolds = 0;

  for (const order of sessionOrders) {
    if (order.status === 'confirmed' || order.status === 'collected') {
      for (const item of order.items) {
        if (item.capacityGroupIdSnapshot === groupId) {
          confirmedDemand += (item.capacityUnitsSnapshot || 0) * item.quantity;
        }
      }
    } else if (order.status === 'pending') {
      // Check if hold is unexpired
      if (!isHoldExpired(order.holdExpiresAt, now)) {
        for (const item of order.items) {
          if (item.capacityGroupIdSnapshot === groupId) {
            unexpiredHolds += (item.capacityUnitsSnapshot || 0) * item.quantity;
          }
        }
      }
    }
    // Drafts, declined, cancelled use 0 capacity (CAP02, CAP05)
  }

  const available = Math.max(0, limit - confirmedDemand - unexpiredHolds);

  return { confirmedDemand, unexpiredHolds, limit, available };
}

/**
 * Summarizes all capacity groups for a given bake session
 */
export function getSessionCapacitySummaries(
  session: BakeSession,
  orders: Order[],
  groups: CapacityGroup[],
  now = new Date()
): SessionCapacitySummary[] {
  return groups.map((grp) => {
    const { confirmedDemand, unexpiredHolds, limit, available } = getSessionGroupUsage(
      session,
      orders,
      grp.id,
      now
    );
    return {
      groupId: grp.id,
      groupName: grp.name,
      unitLabel: grp.unitLabel,
      limit,
      confirmedDemand,
      unexpiredHolds,
      available,
      isAtCapacity: available <= 0,
    };
  });
}

/**
 * Validates whether an order (new or updated) can be placed or confirmed without exceeding limits.
 * Handles hold-to-confirmed conversion without double-counting (CAP03).
 */
export function checkOrderCapacity(
  session: BakeSession,
  allOrders: Order[],
  targetOrder: Order,
  targetStatus: Order['status'],
  groups: CapacityGroup[],
  now = new Date()
): { allowed: boolean; results: CapacityCheckResult[]; blockReason?: string } {
  // Check session status and cutoff
  if (session.status === 'closed' || session.status === 'completed') {
    return {
      allowed: false,
      results: [],
      blockReason: `Bake session for ${session.bakeDate} is ${session.status}. New or confirmed orders cannot be added.`,
    };
  }

  // Check cutoff time (if moving into pending or confirmed)
  if (targetStatus === 'pending' || targetStatus === 'confirmed') {
    const cutoff = new Date(session.orderCutoffAt);
    if (!isNaN(cutoff.getTime()) && now.getTime() > cutoff.getTime()) {
      return {
        allowed: false,
        results: [],
        blockReason: `Order cutoff time (${cutoff.toLocaleString('en-SG')}) has passed for this bake session.`,
      };
    }
  }

  // Calculate demand per group from this order's items
  const requestedByGroup: Record<string, number> = {};
  for (const item of targetOrder.items) {
    const grpId = item.capacityGroupIdSnapshot;
    const units = (item.capacityUnitsSnapshot || 0) * item.quantity;
    requestedByGroup[grpId] = (requestedByGroup[grpId] || 0) + units;
  }

  // Other orders in session (excluding the target order if it already exists)
  const otherOrders = allOrders.filter(
    (o) => o.bakeSessionId === session.id && o.id !== targetOrder.id
  );

  const results: CapacityCheckResult[] = [];
  let allowed = true;
  let blockReason: string | undefined;

  for (const [groupId, requested] of Object.entries(requestedByGroup)) {
    if (requested <= 0) continue;

    const grp = groups.find((g) => g.id === groupId) || {
      id: groupId,
      name: 'Group ' + groupId,
      unitLabel: 'units',
      defaultLimit: 0,
    };

    const { confirmedDemand, unexpiredHolds, limit, available } = getSessionGroupUsage(
      session,
      otherOrders,
      groupId,
      now
    );

    // If targetStatus is 'draft', it takes 0 capacity
    if (targetStatus === 'draft' || targetStatus === 'cancelled' || targetStatus === 'declined') {
      results.push({
        allowed: true,
        groupId,
        groupName: grp.name,
        limit,
        confirmedDemand,
        unexpiredHolds,
        available,
        requested,
      });
      continue;
    }

    // If targetStatus is 'pending' or 'confirmed'
    const canFit = available >= requested;
    if (!canFit) {
      allowed = false;
      const shortfall = requested - available;
      blockReason = `Not enough capacity in ${grp.name}. Available: ${available} ${grp.unitLabel}, Requested: ${requested} ${grp.unitLabel} (shortfall of ${shortfall} ${grp.unitLabel}). To proceed, increase session limit explicitly.`;
    }

    results.push({
      allowed: canFit,
      groupId,
      groupName: grp.name,
      limit,
      confirmedDemand,
      unexpiredHolds,
      available,
      requested,
      reason: canFit ? undefined : blockReason,
    });
  }

  return { allowed, results, blockReason };
}

/**
 * Calculates consolidated product totals for production bake sheets (ORD04, A4)
 * Confirmed orders aggregate into confirmedQuantity.
 * Pending unexpired orders show separately as heldQuantity.
 * Cancelled and declined orders do NOT enter confirmed bake totals!
 */
export function getConsolidatedProductionTotals(
  sessionId: string,
  orders: Order[],
  products: Product[],
  now = new Date()
): ConsolidatedProductTotal[] {
  const sessionOrders = orders.filter((o) => o.bakeSessionId === sessionId);
  const totalsMap: Record<
    string,
    {
      productId: string;
      productName: string;
      unitLabel: string;
      confirmedQuantity: number;
      heldQuantity: number;
      capacityGroupId: string;
      capacityUnitsTotal: number;
      orderCount: number;
    }
  > = {};

  for (const order of sessionOrders) {
    if (order.status === 'confirmed' || order.status === 'collected') {
      for (const item of order.items) {
        if (!totalsMap[item.productId]) {
          const prod = products.find((p) => p.id === item.productId);
          totalsMap[item.productId] = {
            productId: item.productId,
            productName: item.productNameSnapshot || prod?.name || 'Product',
            unitLabel: prod?.unitLabel || 'unit',
            confirmedQuantity: 0,
            heldQuantity: 0,
            capacityGroupId: item.capacityGroupIdSnapshot || prod?.capacityGroupId || '',
            capacityUnitsTotal: 0,
            orderCount: 0,
          };
        }
        totalsMap[item.productId].confirmedQuantity += item.quantity;
        totalsMap[item.productId].capacityUnitsTotal +=
          (item.capacityUnitsSnapshot || 0) * item.quantity;
        totalsMap[item.productId].orderCount += 1;
      }
    } else if (order.status === 'pending' && !isHoldExpired(order.holdExpiresAt, now)) {
      for (const item of order.items) {
        if (!totalsMap[item.productId]) {
          const prod = products.find((p) => p.id === item.productId);
          totalsMap[item.productId] = {
            productId: item.productId,
            productName: item.productNameSnapshot || prod?.name || 'Product',
            unitLabel: prod?.unitLabel || 'unit',
            confirmedQuantity: 0,
            heldQuantity: 0,
            capacityGroupId: item.capacityGroupIdSnapshot || prod?.capacityGroupId || '',
            capacityUnitsTotal: 0,
            orderCount: 0,
          };
        }
        totalsMap[item.productId].heldQuantity += item.quantity;
      }
    }
  }

  return Object.values(totalsMap).sort((a, b) => b.confirmedQuantity - a.confirmedQuantity);
}
