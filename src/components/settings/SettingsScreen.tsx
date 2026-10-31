/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Settings, Backup/Restore & Section 8 Acceptance Test Runner
 */

import React, { useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  FileCode,
  Building,
  MessageSquare,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AppState, storageService } from '../../services/storage';
import {
  exportBackupJson,
  downloadFile,
  validateAndPreviewBackup,
} from '../../services/exportRestore';
import { runAcceptanceTests, TestCaseResult } from '../../services/acceptanceTests';
import { formatDateTime } from '../../services/formatters';

interface SettingsScreenProps {
  appState: AppState;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ appState }) => {
  const { settings, capacityGroups } = appState;

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'settings' | 'backup' | 'acceptance'>('settings');

  // Business settings form state
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [collectionAddress, setCollectionAddress] = useState(settings.defaultCollectionAddress);
  const [defaultHoldHours, setDefaultHoldHours] = useState(settings.defaultHoldHours);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Restore JSON state
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restorePreview, setRestorePreview] = useState<ReturnType<typeof validateAndPreviewBackup> | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  // Acceptance Test Suite results
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveSettings({
      ownerName,
      businessName,
      defaultCollectionAddress: collectionAddress,
      defaultHoldHours,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportBackup = () => {
    const jsonStr = exportBackupJson();
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(jsonStr, `kharis-bake-backup-${dateStr}.json`, 'application/json');
  };

  const handleValidateRestore = () => {
    const res = validateAndPreviewBackup(restoreJsonInput);
    setRestorePreview(res);
  };

  const handleConfirmRestore = () => {
    if (!restorePreview || !restorePreview.valid || !restorePreview.parsedState) return;
    if (
      window.confirm(
        'Confirm workspace restore? Current demo data will be replaced by the backup snapshot.'
      )
    ) {
      const res = storageService.restoreFromBackup(restorePreview.parsedState);
      setRestoreMessage(res.message);
      setRestorePreview(null);
      setRestoreJsonInput('');
    }
  };

  const handleRunAcceptanceTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await runAcceptanceTests();
      setTestResults(res);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div>
        <h2 className="font-serif-heading text-2xl font-bold text-[#282624]">
          Settings & Diagnostics
        </h2>
        <p className="text-xs text-[#6B655F]">
          Operating assumptions, JSON backup & restore, and Section 8 pilot acceptance tests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E4DDD3]">
        <button
          onClick={() => setActiveTab('settings')}
          className={`touch-target flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activeTab === 'settings'
              ? 'border-[#526043] text-[#526043]'
              : 'border-transparent text-stone-500 hover:text-[#282624]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Business Config</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`touch-target flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activeTab === 'backup'
              ? 'border-[#526043] text-[#526043]'
              : 'border-transparent text-stone-500 hover:text-[#282624]'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Backup & Restore (A10)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('acceptance');
            if (testResults.length === 0) handleRunAcceptanceTests();
          }}
          className={`touch-target flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors ${
            activeTab === 'acceptance'
              ? 'border-[#526043] text-[#526043]'
              : 'border-transparent text-stone-500 hover:text-[#282624]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Acceptance Tests (A1–A12)</span>
        </button>
      </div>

      {/* 1. Business Config Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl text-xs">
          {saveSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settings successfully saved!</span>
            </div>
          )}

          <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-serif-heading text-base font-bold text-[#282624]">
              Artisan Profile & Operating Assumptions (Section 1)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                  Owner / Baker Name
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                  Operating Currency
                </label>
                <input
                  type="text"
                  disabled
                  value="SGD (Singapore Dollars S$)"
                  className="w-full rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-stone-600"
                />
                <p className="mt-1 text-[10px] text-stone-500">
                  All money stored as integer cents without floating-point inaccuracies (ORD04).
                </p>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                  Business Timezone
                </label>
                <input
                  type="text"
                  disabled
                  value="Asia/Singapore (SGT, UTC+8)"
                  className="w-full rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-stone-600"
                />
                <p className="mt-1 text-[10px] text-stone-500">
                  Fixed timezone for order cutoffs and collection windows.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Default Pending Request Hold Expiry (CAP02)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={defaultHoldHours}
                  onChange={(e) => setDefaultHoldHours(parseInt(e.target.value, 10) || 24)}
                  className="w-24 rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 font-mono-numbers font-bold"
                />
                <span className="text-stone-600">hours before unconfirmed hold is auto-released</span>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Default Collection Location & Studio Instructions
              </label>
              <textarea
                rows={2}
                value={collectionAddress}
                onChange={(e) => setCollectionAddress(e.target.value)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-xs"
              />
              <p className="mt-1 text-[10px] text-stone-500">
                Injected into confirmation and collection-ready WhatsApp drafts.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="touch-target rounded-xl bg-[#526043] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#3F4C33]"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 2. Backup & Restore Tab (Section 6, A10) */}
      {activeTab === 'backup' && (
        <div className="space-y-5 max-w-2xl text-xs">
          {restoreMessage && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-emerald-800 font-semibold">
              {restoreMessage}
            </div>
          )}

          {/* Export card */}
          <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm space-y-3">
            <h3 className="font-serif-heading text-base font-bold text-[#282624]">
              Export Full Versioned JSON Backup (Section 6)
            </h3>
            <p className="text-stone-600 leading-relaxed">
              Downloads a complete JSON snapshot containing all customers, products, bake sessions, confirmed & pending orders, payments, prep tasks, and content shot lists.
            </p>
            <div className="text-[11px] text-stone-500">
              Last backup: {settings.lastBackupAt ? formatDateTime(settings.lastBackupAt) : 'None recorded yet'}
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="touch-target inline-flex items-center gap-2 rounded-xl bg-[#526043] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#3F4C33] shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup</span>
            </button>
          </div>

          {/* Restore card */}
          <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm space-y-3">
            <h3 className="font-serif-heading text-base font-bold text-[#282624]">
              Restore Workspace from JSON (Section 6, A10)
            </h3>
            <p className="text-stone-600 leading-relaxed">
              Paste a previously exported backup payload. The schema will be validated and object counts previewed before confirmation.
            </p>

            <textarea
              rows={5}
              placeholder="Paste JSON backup payload here..."
              value={restoreJsonInput}
              onChange={(e) => {
                setRestoreJsonInput(e.target.value);
                setRestorePreview(null);
              }}
              className="w-full rounded-xl border border-[#D3C7B6] bg-stone-50 p-3 font-mono text-[11px]"
            />

            <button
              type="button"
              onClick={handleValidateRestore}
              className="touch-target rounded-xl border border-[#526043] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#526043] hover:bg-[#EEF2EB]"
            >
              Validate & Preview Backup
            </button>

            {restorePreview && (
              <div
                className={`rounded-xl border p-3.5 space-y-2 ${
                  restorePreview.valid
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {restorePreview.valid ? (
                  <>
                    <div className="font-bold">✓ Backup Validated Successfully</div>
                    <ul className="grid grid-cols-2 gap-1 text-[11px] text-stone-700">
                      <li>• Customers: {restorePreview.preview?.customersCount}</li>
                      <li>• Orders: {restorePreview.preview?.ordersCount}</li>
                      <li>• Sessions: {restorePreview.preview?.sessionsCount}</li>
                      <li>• Products: {restorePreview.preview?.productsCount}</li>
                      <li>• Content Items: {restorePreview.preview?.contentItemsCount}</li>
                      <li>• Shots: {restorePreview.preview?.shotsCount}</li>
                    </ul>
                    <button
                      type="button"
                      onClick={handleConfirmRestore}
                      className="mt-2 touch-target w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-800 shadow-sm"
                    >
                      Confirm & Replace Workspace
                    </button>
                  </>
                ) : (
                  <div>
                    <div className="font-bold">❌ Validation Failed</div>
                    <p className="text-[11px] mt-0.5">{restorePreview.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Acceptance Tests Tab (PRD Section 8) */}
      {activeTab === 'acceptance' && (
        <div className="space-y-4 max-w-4xl text-xs">
          <div className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                PRD Section 8 Acceptance Test Suite (Tests A1 – A12)
              </h3>
              <p className="text-xs text-[#6B655F]">
                Automated synthetic verification for currency precision, capacity race conditions, hold releases, and PWA readiness.
              </p>
            </div>

            <button
              type="button"
              disabled={isRunningTests}
              onClick={handleRunAcceptanceTests}
              className="touch-target inline-flex items-center gap-2 rounded-xl bg-[#526043] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#3F4C33] shadow-sm shrink-0 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunningTests ? 'Running Suite...' : 'Re-run Tests'}</span>
            </button>
          </div>

          {/* Test results grid */}
          <div className="space-y-3">
            {testResults.map((test) => {
              const isPass = test.status === 'passed';
              return (
                <div
                  key={test.id}
                  className={`rounded-2xl border p-4 shadow-xs transition-all ${
                    isPass
                      ? 'bg-white border-[#D8CEBF]'
                      : 'bg-rose-50 border-rose-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono-numbers px-2 py-0.5 rounded font-bold text-xs ${
                          isPass ? 'bg-[#EEF2EB] text-[#3F4C33]' : 'bg-rose-200 text-rose-900'
                        }`}
                      >
                        {test.id}
                      </span>
                      <h4 className="font-bold text-sm text-[#282624]">{test.title}</h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPass ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>PASS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-full text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>FAIL</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-stone-600 text-[11px]">
                    <strong>Expected: </strong>
                    {test.expected}
                  </p>

                  <div className="mt-2 rounded-xl bg-[#FAF7F2] border border-[#E4DDD3] p-2.5 text-[11px]">
                    <span className="font-semibold text-stone-700">Recorded Evidence: </span>
                    <span className="text-stone-800 font-mono text-[11px]">{test.evidence}</span>
                  </div>

                  {test.details && test.details.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-stone-200 space-y-0.5 text-[10px] text-stone-500 font-mono">
                      {test.details.map((d, i) => (
                        <div key={i}>{d}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
