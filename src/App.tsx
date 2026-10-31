/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kharis Bake Operations Planner
 * Sole owner and baker workspace for KimB
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { DesktopSidebar, MobileBottomNav, ScreenTab } from './components/common/Navigation';
import { TodayScreen } from './components/today/TodayScreen';
import { OrdersScreen } from './components/orders/OrdersScreen';
import { BakePlannerScreen } from './components/bake/BakePlannerScreen';
import { ContentScreen } from './components/content/ContentScreen';
import { CatalogScreen } from './components/catalog/CatalogScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { QuickAddOrderModal } from './components/orders/QuickAddOrderModal';
import { OrderDetailModal } from './components/orders/OrderDetailModal';
import { AppState, storageService } from './services/storage';
import { Order, Shot } from './types';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { calculateOrderBalance } from './services/formatters';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => storageService.getState());
  const [currentTab, setCurrentTab] = useState<ScreenTab>('today');
  const isOnline = useOnlineStatus();

  // Modals state
  const [isQuickAddOrderOpen, setIsQuickAddOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = storageService.subscribe((newState) => {
      setAppState(newState);
      // Keep selectedOrder in sync if open
      if (selectedOrder) {
        const refreshed = newState.orders.find((o) => o.id === selectedOrder.id);
        if (refreshed) setSelectedOrder(refreshed);
      }
    });
    return () => unsubscribe();
  }, [selectedOrder]);

  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleToggleShotStatus = (shotId: string, currentStatus: Shot['status']) => {
    const next = currentStatus === 'needed' ? 'captured' : currentStatus === 'captured' ? 'skipped' : 'needed';
    storageService.updateShotStatus(shotId, next);
  };

  // Compute counters for badges
  const pendingCount = appState.orders.filter((o) => o.status === 'pending').length;
  const unpaidCount = appState.orders.filter((o) => {
    if (o.status !== 'confirmed') return false;
    const { paymentStatus } = calculateOrderBalance(o.totalCents, o.payments);
    return paymentStatus === 'unpaid' || paymentStatus === 'part_paid';
  }).length;

  const currentOrderCustomer = selectedOrder
    ? appState.customers.find((c) => c.id === selectedOrder.customerId)
    : undefined;

  const currentOrderSession = selectedOrder
    ? appState.bakeSessions.find((s) => s.id === selectedOrder.bakeSessionId)
    : undefined;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#282624] flex flex-col font-sans">
      {/* Offline Banner (Section 6: block mutations and notify) */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm">
          <WifiOff className="w-4 h-4" />
          <span>
            Offline Mode: Operating from local shell cache. Order write mutations are blocked until connectivity returns (PRD Section 6).
          </span>
        </div>
      )}

      {/* Main Header */}
      <Header
        onQuickAddOrder={() => {
          if (!isOnline) {
            alert('Cannot create orders while offline. Reconnect to internet.');
            return;
          }
          setIsQuickAddOrderOpen(true);
        }}
      />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar (1440px / large screen) */}
        <DesktopSidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingCount={pendingCount}
          unpaidCount={unpaidCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {currentTab === 'today' && (
            <TodayScreen
              appState={appState}
              onQuickAddOrder={() => setIsQuickAddOrderOpen(true)}
              onOpenOrder={handleOpenOrder}
              onNavigateToTab={setCurrentTab}
              onToggleShotStatus={handleToggleShotStatus}
            />
          )}

          {currentTab === 'orders' && (
            <OrdersScreen
              appState={appState}
              onOpenOrder={handleOpenOrder}
              onQuickAddOrder={() => setIsQuickAddOrderOpen(true)}
            />
          )}

          {currentTab === 'bake' && (
            <BakePlannerScreen
              appState={appState}
              onOpenOrder={handleOpenOrder}
            />
          )}

          {currentTab === 'content' && (
            <ContentScreen appState={appState} />
          )}

          {currentTab === 'catalog' && (
            <CatalogScreen
              appState={appState}
              onOpenOrder={handleOpenOrder}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsScreen appState={appState} />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (360px) */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingCount={pendingCount}
      />

      {/* Quick Add Order Modal */}
      {isQuickAddOrderOpen && (
        <QuickAddOrderModal
          isOpen={isQuickAddOrderOpen}
          onClose={() => setIsQuickAddOrderOpen(false)}
          onOrderCreated={(order) => {
            setSelectedOrder(order);
          }}
          customers={appState.customers}
          bakeSessions={appState.bakeSessions}
          products={appState.products}
          capacityGroups={appState.capacityGroups}
          allOrders={appState.orders}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          customer={currentOrderCustomer}
          session={currentOrderSession}
          settings={appState.settings}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={() => {
            // Updated via reactive storage subscriber
          }}
        />
      )}
    </div>
  );
}
