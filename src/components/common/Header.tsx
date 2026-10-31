/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * App Header for Kharis Bake Operations Planner
 */

import React from 'react';
import { Sparkles, WifiOff, RotateCcw, Plus, Wheat } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { storageService } from '../../services/storage';

interface HeaderProps {
  onQuickAddOrder: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickAddOrder }) => {
  const isOnline = useOnlineStatus();

  const handleResetSampleData = () => {
    if (
      window.confirm(
        'Reset to clean synthetic prototype data? This will restore the default 5 customers, 3 bake sessions, and sample orders.'
      )
    ) {
      storageService.resetToSampleData();
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#E6DEC8] bg-[#FAF7F2]/95 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#526043] text-[#FAF7F2] flex items-center justify-center shadow-sm shrink-0">
            <Wheat className="w-6 h-6 text-[#F2EFE9]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif-heading text-lg font-bold tracking-tight text-[#282624] sm:text-xl">
                Kharis Bake
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Demo (Stage A)</span>
              </span>
            </div>
            <p className="text-xs text-[#6B655F]">
              Owner: KimB • Asia/Singapore (SGT)
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isOnline && (
            <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline (Read Only)</span>
            </div>
          )}

          <button
            onClick={handleResetSampleData}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#D3C7B6] bg-white px-2.5 py-1.5 text-xs font-medium text-[#6B655F] hover:bg-[#F2ECE1] transition-colors"
            title="Reset to synthetic prototype data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset Demo</span>
          </button>

          <PWAInstallButton />

          <button
            onClick={onQuickAddOrder}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg bg-[#526043] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#3F4C33] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden xs:inline">Quick Order</span>
          </button>
        </div>
      </div>
    </header>
  );
};
