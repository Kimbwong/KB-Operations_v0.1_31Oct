/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Responsive Navigation for Kharis Bake Operations Planner
 * Mobile Bottom Bar + Desktop Sidebar
 */

import React from 'react';
import {
  CalendarDays,
  ClipboardList,
  Flame,
  Camera,
  Users,
  Settings,
} from 'lucide-react';

export type ScreenTab = 'today' | 'orders' | 'bake' | 'content' | 'catalog' | 'settings';

interface NavigationProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  pendingCount?: number;
  unpaidCount?: number;
}

const navItems: { id: ScreenTab; label: string; icon: React.ElementType }[] = [
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'bake', label: 'Bake Planner', icon: Flame },
  { id: 'content', label: 'Content', icon: Camera },
  { id: 'catalog', label: 'Directory', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const DesktopSidebar: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  pendingCount = 0,
  unpaidCount = 0,
}) => {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-[#E6DEC8] bg-[#F4EFE6] p-4 shrink-0">
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`touch-target w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#526043] text-white shadow-sm'
                  : 'text-[#4A4541] hover:bg-[#EAE3D6] hover:text-[#282624]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#526043]'}`} />
                <span>{item.label}</span>
              </div>

              {item.id === 'orders' && pendingCount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    isActive ? 'bg-white text-[#526043]' : 'bg-amber-200 text-amber-900'
                  }`}
                  title={`${pendingCount} pending requests`}
                >
                  {pendingCount}
                </span>
              )}

              {item.id === 'today' && unpaidCount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isActive ? 'bg-white text-[#526043]' : 'bg-rose-100 text-rose-800'
                  }`}
                  title={`${unpaidCount} unpaid confirmed orders`}
                >
                  {unpaidCount} unpaid
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Production stats footer in sidebar */}
      <div className="rounded-xl border border-[#D8CEBF] bg-[#FAF7F2] p-3 text-xs text-[#6B655F]">
        <div className="font-semibold text-[#282624] mb-1">KimB • Kharis Bake</div>
        <p className="text-[11px] leading-relaxed">
          Order administration, bake planning & shot capture in one unified workspace.
        </p>
      </div>
    </aside>
  );
};

export const MobileBottomNav: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  pendingCount = 0,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E6DEC8] bg-[#FAF7F2]/95 backdrop-blur-md px-1 py-1 safe-area-pb">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`touch-target flex flex-col items-center justify-center flex-1 py-1 relative text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#526043] font-bold' : 'text-[#6B655F] hover:text-[#282624]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                {item.id === 'orders' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="mt-1 tracking-tight truncate max-w-[58px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
