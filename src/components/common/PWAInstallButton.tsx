/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PWA Install Button and iOS guide modal
 */

import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running standalone, hide
  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="touch-target inline-flex items-center gap-2 rounded-lg bg-[#526043] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#3F4C33] transition-colors focus:ring-2 focus:ring-[#526043] focus:ring-offset-2"
        title="Install Kharis Bake app to home screen"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#D3C7B6] bg-white px-3 py-1.5 text-xs font-semibold text-[#526043] hover:bg-[#FAF7F2] transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
                <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                  Install on iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-sm text-[#4A4541]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#EEF2EB] text-[#526043]">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-[#282624]">1. Tap Share in Safari</p>
                    <p className="text-xs text-stone-500">Tap the Share icon at the bottom of Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#EEF2EB] text-[#526043]">
                    <PlusSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-[#282624]">2. Add to Home Screen</p>
                    <p className="text-xs text-stone-500">Scroll down the menu and choose "Add to Home Screen".</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-[#526043] py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#3F4C33]"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // On browsers that don't support beforeinstallprompt yet aren't iOS, show a gentle tooltip/button
  return (
    <button
      onClick={() =>
        alert('To install Kharis Bake: In Chrome/Edge, click the install icon in your address bar or browser menu.')
      }
      className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#D3C7B6] bg-white px-3 py-1.5 text-xs font-medium text-[#526043] hover:bg-[#FAF7F2]"
      title="Install PWA info"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install</span>
    </button>
  );
};
