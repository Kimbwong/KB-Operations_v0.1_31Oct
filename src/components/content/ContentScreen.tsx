/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Content & Shot Capture Screen (PRD Section 2, CON01 - CON09)
 * Monthly calendar & list, planned posts, linked bake sessions, shot list, slicing loaf modal, CSV import
 */

import React, { useState, useMemo } from 'react';
import {
  Camera,
  Calendar,
  Plus,
  Upload,
  Download,
  CheckCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  Link,
  Film,
  Instagram,
  ChevronRight,
  ExternalLink,
  Scissors,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { AppState, storageService } from '../../services/storage';
import { ContentItem, Shot, ShotPhase, ChannelType, FormatType } from '../../types';
import { formatDate } from '../../services/formatters';
import { StatusBadge } from '../common/StatusBadge';
import {
  CONTENT_CSV_TEMPLATE,
  downloadFile,
  parseContentCsv,
} from '../../services/exportRestore';

interface ContentScreenProps {
  appState: AppState;
}

export const ContentScreen: React.FC<ContentScreenProps> = ({ appState }) => {
  const { contentItems, shots, bakeSessions, products } = appState;

  // View toggle: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [isNewContentOpen, setIsNewContentOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Slicing Shot Acknowledgement Modal (CON07)
  const [pendingSlicingShot, setPendingSlicingShot] = useState<Shot | null>(null);
  const [isAddShotOpen, setIsAddShotOpen] = useState<string | null>(null); // contentItemId

  const filteredItems = useMemo(() => {
    return contentItems.filter((item) => {
      if (filterChannel !== 'all' && item.channel !== filterChannel) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      return true;
    });
  }, [contentItems, filterChannel, filterStatus]);

  const handleToggleShotStatus = (shot: Shot) => {
    // If it's a slicing shot and moving to captured without personal loaf acknowledged, require confirmation (CON07)
    if (
      shot.phase === 'slicing' &&
      shot.status !== 'captured' &&
      !shot.personalLoafAcknowledged
    ) {
      setPendingSlicingShot(shot);
      return;
    }

    const nextStatus = shot.status === 'needed' ? 'captured' : shot.status === 'captured' ? 'skipped' : 'needed';
    storageService.updateShotStatus(shot.id, nextStatus);
  };

  const handleConfirmSlicingPersonalLoaf = () => {
    if (!pendingSlicingShot) return;
    storageService.saveShot({
      ...pendingSlicingShot,
      personalLoafAcknowledged: true,
      status: 'captured',
    });
    setPendingSlicingShot(null);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif-heading text-2xl font-bold text-[#282624]">
            Content & Shot Capture
          </h2>
          <p className="text-xs text-[#6B655F]">
            Capture opportunities during normal baking. Content tasks never force extra production.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCsvImportOpen(true)}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-xs font-semibold text-[#4A4541] hover:bg-[#FAF7F2]"
            title="Import calendar from CSV (CON09)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setIsNewContentOpen(true)}
            className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#526043] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#3F4C33] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Post</span>
          </button>
        </div>
      </div>

      {/* Practical Design Rule Banner (Section 4) */}
      <div className="rounded-xl border border-[#C8D6BE] bg-[#EEF2EB] p-3.5 text-xs text-[#3F4C33] flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-[#526043] shrink-0" />
        <p className="leading-relaxed">
          <strong>Practical design rule:</strong> Content tasks are optional and skippable in one tap. The planner makes existing production easier to capture without compulsory posting streaks.
        </p>
      </div>

      {/* Controls & Filter Bar */}
      <div className="rounded-2xl border border-[#D3C7B6] bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 text-xs">
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="rounded-xl border border-[#D3C7B6] bg-[#FAF7F2] px-3 py-1.5 font-medium"
          >
            <option value="all">All Channels</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="whatsapp">WhatsApp Status</option>
            <option value="newsletter">Newsletter</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-[#D3C7B6] bg-[#FAF7F2] px-3 py-1.5 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="idea">Idea</option>
            <option value="planned">Planned</option>
            <option value="ready">Ready</option>
            <option value="published">Published</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>

        <div className="text-xs text-[#6B655F]">
          Showing <strong>{filteredItems.length}</strong> content items
        </div>
      </div>

      {/* Content Items & Linked Shots List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-[#D3C7B6] bg-white p-12 text-center text-stone-500 text-xs">
            <Camera className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            <p>No content items found for the selected filter.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const itemShots = shots.filter((s) => s.contentItemId === item.id);
            const associatedProducts = products.filter((p) => item.productIds.includes(p.id));

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-[#D3C7B6] bg-white p-5 shadow-sm space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E4DDD3]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
                        {item.title}
                      </h3>
                      <StatusBadge type="content" status={item.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#6B655F] mt-0.5">
                      <span className="capitalize font-semibold text-[#526043]">
                        {item.channel} • {item.format}
                      </span>
                      <span>•</span>
                      <span>Planned: {formatDate(item.publicationDate)}</span>
                      {item.importKey && (
                        <>
                          <span>•</span>
                          <span className="font-mono-numbers text-[10px] text-stone-400">
                            Ref: {item.importKey}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddShotOpen(item.id)}
                      className="touch-target inline-flex items-center gap-1 rounded-lg border border-[#D3C7B6] bg-[#FAF7F2] px-2.5 py-1 text-xs font-semibold text-[#526043] hover:bg-[#EEF2EB]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Shot</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingContent(item)}
                      className="touch-target text-xs font-semibold text-stone-500 hover:text-stone-800 px-2 py-1"
                    >
                      Edit Post
                    </button>
                  </div>
                </div>

                {/* Hook & Caption Notes */}
                {(item.hook || item.captionNotes) && (
                  <div className="rounded-xl bg-[#FAF7F2] p-3 text-xs space-y-1 border border-[#E4DDD3]">
                    {item.hook && (
                      <p className="text-[#282624]">
                        <strong className="text-[#526043]">Hook: </strong>
                        {item.hook}
                      </p>
                    )}
                    {item.captionNotes && (
                      <p className="text-stone-600">
                        <strong className="text-stone-700">Notes: </strong>
                        {item.captionNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Linked Shots Section (CON03, CON04, CON06) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B655F]">
                      Linked Shots ({itemShots.filter((s) => s.status === 'captured').length} / {itemShots.length} captured)
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Est. capture time: {itemShots.reduce((sum, s) => sum + s.durationMinutes, 0)} min
                    </span>
                  </div>

                  {itemShots.length === 0 ? (
                    <p className="text-xs text-stone-400 italic py-2">
                      No production shots linked to this content item yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {itemShots.map((shot) => {
                        const linkedSession = bakeSessions.find((s) => s.id === shot.bakeSessionId);
                        const isCaptured = shot.status === 'captured';

                        return (
                          <div
                            key={shot.id}
                            className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                              isCaptured
                                ? 'bg-emerald-50/50 border-emerald-200 text-stone-600'
                                : 'bg-[#FAF7F2] border-[#D8CEBF] text-[#282624]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleShotStatus(shot)}
                                  className={`touch-target mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                    isCaptured
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-stone-400 bg-white hover:border-[#526043]'
                                  }`}
                                  title="Toggle needed / captured"
                                >
                                  {isCaptured && <Check className="w-3.5 h-3.5" />}
                                </button>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs">
                                      {shot.phase.replace(/_/g, ' ')}
                                    </span>
                                    {shot.priority === 'high' && (
                                      <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                        PRIORITY
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-stone-700 mt-0.5">
                                    {shot.description}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px] text-stone-500">
                              <span>
                                {linkedSession ? `Session: ${formatDate(linkedSession.bakeDate)}` : 'Unlinked session'}
                              </span>
                              <span>{shot.orientation.replace(/_/g, ' ')} • {shot.durationMinutes}m</span>
                            </div>

                            {shot.setup && (
                              <p className="mt-1 text-[10px] text-[#526043]">
                                <strong>Setup: </strong>{shot.setup}
                              </p>
                            )}

                            {shot.assetLink && (
                              <a
                                href={shot.assetLink}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 text-[10px] text-sky-700 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>View Asset Clip</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Slicing Loaf Acknowledgement Modal (CON07) */}
      {pendingSlicingShot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#FAF7F2] border border-amber-400 p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-900 pb-2 border-b border-amber-200">
              <Scissors className="w-6 h-6 text-amber-600" />
              <h3 className="font-serif-heading text-lg font-bold">
                Slicing Shot Rule (CON07)
              </h3>
            </div>
            <p className="mt-3 text-xs text-[#4A4541] leading-relaxed">
              <strong>Requirement:</strong> A slicing shot requires owner acknowledgement that a sample or personal loaf is available.
            </p>
            <p className="mt-2 text-xs text-stone-600 bg-white p-3 rounded-xl border border-amber-200">
              <em>"A content requirement never adds a saleable loaf to production automatically or destroys a customer's confirmed loaf."</em>
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingSlicingShot(null)}
                className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-stone-700 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSlicingPersonalLoaf}
                className="touch-target flex-1 rounded-xl bg-[#526043] py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#3F4C33]"
              >
                Personal Loaf Available
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal (CON09) */}
      {isCsvImportOpen && (
        <ContentCsvImportModal
          isOpen={isCsvImportOpen}
          onClose={() => setIsCsvImportOpen(false)}
        />
      )}

      {/* New / Edit Post Modal */}
      {(isNewContentOpen || editingContent) && (
        <EditContentItemModal
          item={editingContent}
          isOpen={isNewContentOpen || !!editingContent}
          onClose={() => {
            setIsNewContentOpen(false);
            setEditingContent(null);
          }}
          products={products}
        />
      )}

      {/* Add Shot Modal */}
      {isAddShotOpen && (
        <AddShotModal
          contentItemId={isAddShotOpen}
          bakeSessions={bakeSessions}
          products={products}
          isOpen={!!isAddShotOpen}
          onClose={() => setIsAddShotOpen(null)}
        />
      )}
    </div>
  );
};

// Subcomponent: CSV Import Modal (CON09)
const ContentCsvImportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [csvText, setCsvText] = useState<string>(CONTENT_CSV_TEMPLATE);
  const [previewResults, setPreviewResults] = useState<ReturnType<typeof parseContentCsv> | null>(null);

  if (!isOpen) return null;

  const handlePreview = () => {
    const res = parseContentCsv(csvText);
    setPreviewResults(res);
  };

  const handleCommit = () => {
    if (!previewResults) return;
    const validRows = previewResults.results.filter((r) => !r.error && r.data);
    for (const r of validRows) {
      if (r.data) {
        storageService.saveContentItem(r.data as any);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-[#E4DDD3]">
          <div>
            <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
              Import Content Calendar CSV (CON09)
            </h3>
            <p className="text-xs text-[#6B655F]">
              Paste CSV with template headers. Duplicate keys and invalid lines will be flagged.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 space-y-3 flex-1 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[#6B655F]">
                CSV Content
              </label>
              <button
                type="button"
                onClick={() => setCsvText(CONTENT_CSV_TEMPLATE)}
                className="text-xs text-[#526043] font-semibold hover:underline"
              >
                Load Template
              </button>
            </div>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white p-2.5 text-xs font-mono font-mono-numbers"
            />
          </div>

          <button
            type="button"
            onClick={handlePreview}
            className="w-full rounded-xl border border-[#526043] bg-white py-2 text-xs font-bold text-[#526043] hover:bg-[#EEF2EB]"
          >
            Validate & Preview Rows
          </button>

          {previewResults && (
            <div className="rounded-xl border border-[#D3C7B6] bg-white p-3 text-xs space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-emerald-800">Valid: {previewResults.validCount} rows</span>
                <span className="text-rose-800">Errors: {previewResults.errorCount} rows</span>
              </div>

              {previewResults.errorCount > 0 && (
                <div className="space-y-1 text-rose-700 bg-rose-50 p-2 rounded-lg text-[11px]">
                  {previewResults.results
                    .filter((r) => r.error)
                    .map((err, i) => (
                      <div key={i}>
                        Line {err.rowNumber}: {err.error}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[#E4DDD3] flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2 text-xs font-bold uppercase tracking-wider text-stone-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!previewResults || previewResults.validCount === 0}
            onClick={handleCommit}
            className="touch-target flex-1 rounded-xl bg-[#526043] py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#3F4C33] disabled:opacity-40"
          >
            Import {previewResults?.validCount || 0} Valid Items
          </button>
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Add Shot Modal
const AddShotModal: React.FC<{
  contentItemId: string;
  bakeSessions: any[];
  products: any[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ contentItemId, bakeSessions, products, isOpen, onClose }) => {
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<ShotPhase>('ingredient_prep');
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [orientation, setOrientation] = useState<Shot['orientation']>('vertical_9_16');
  const [setup, setSetup] = useState('');
  const [props, setProps] = useState('');
  const [priority, setPriority] = useState<Shot['priority']>('high');
  const [bakeSessionId, setBakeSessionId] = useState<string>(bakeSessions[0]?.id || '');
  const [assetLink, setAssetLink] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    storageService.saveShot({
      contentItemId,
      bakeSessionId: bakeSessionId || undefined,
      description: description.trim(),
      phase,
      durationMinutes,
      orientation,
      setup: setup.trim(),
      props: props.trim() || undefined,
      priority,
      status: 'needed',
      assetLink: assetLink.trim() || undefined,
      requiresPersonalLoaf: phase === 'slicing',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl">
        <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
          Add Linked Shot (CON03, CON04)
        </h3>
        <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Saturday prep: close up of cheddar cubes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Bake Phase (CON05)
              </label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as ShotPhase)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
              >
                <option value="ingredient_prep">Ingredient Prep</option>
                <option value="folding">Mixing & Folding</option>
                <option value="shaping">Shaping & Scoring</option>
                <option value="oven_unload">Oven Unload</option>
                <option value="cooling">Cooling & Audio</option>
                <option value="slicing">Slicing / Crumb Test</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Priority (Max 3 / Session)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
              >
                <option value="high">High (Priority 1-3)</option>
                <option value="normal">Normal</option>
                <option value="low">Low / Optional</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Orientation
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
              >
                <option value="vertical_9_16">Vertical (9:16 Reels)</option>
                <option value="horizontal_16_9">Horizontal (16:9)</option>
                <option value="square_1_1">Square (1:1)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Est. Minutes
              </label>
              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Link to Bake Session
            </label>
            <select
              value={bakeSessionId}
              onChange={(e) => setBakeSessionId(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            >
              <option value="">-- No session linked --</option>
              {bakeSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.bakeDate)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Setup & Props
            </label>
            <input
              type="text"
              placeholder="e.g. Window side-light, olive cutting board, linen cloth"
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2 font-bold uppercase text-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="touch-target flex-1 rounded-xl bg-[#526043] py-2 font-bold uppercase text-white hover:bg-[#3F4C33]"
            >
              Save Shot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Subcomponent: EditContentItemModal
const EditContentItemModal: React.FC<{
  item: ContentItem | null;
  isOpen: boolean;
  onClose: () => void;
  products: any[];
}> = ({ item, isOpen, onClose, products }) => {
  const [title, setTitle] = useState(item?.title || '');
  const [publicationDate, setPublicationDate] = useState(
    item?.publicationDate || new Date().toISOString().split('T')[0]
  );
  const [channel, setChannel] = useState<ChannelType>(item?.channel || 'instagram');
  const [format, setFormat] = useState<FormatType>(item?.format || 'reels');
  const [theme, setTheme] = useState(item?.theme || 'Artisan process');
  const [hook, setHook] = useState(item?.hook || '');
  const [captionNotes, setCaptionNotes] = useState(item?.captionNotes || '');
  const [status, setStatus] = useState<ContentItem['status']>(item?.status || 'planned');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    storageService.saveContentItem({
      id: item?.id,
      title: title.trim(),
      publicationDate,
      channel,
      format,
      theme: theme.trim(),
      hook: hook.trim() || undefined,
      captionNotes: captionNotes.trim() || undefined,
      status,
      productIds: item?.productIds || [],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#FAF7F2] border border-[#D3C7B6] p-6 shadow-2xl">
        <h3 className="font-serif-heading text-lg font-bold text-[#282624]">
          {item ? 'Edit Content Item' : 'New Content Item (CON01)'}
        </h3>
        <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Green Chilli Cheddar Sourdough - Fold to Oven Journey"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-2 py-2"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="newsletter">Newsletter</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-2 py-2"
              >
                <option value="reels">Reels / Video</option>
                <option value="carousel">Carousel</option>
                <option value="static">Single Photo</option>
                <option value="story">Story</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-[#D3C7B6] bg-white px-2 py-2 font-semibold"
              >
                <option value="idea">Idea</option>
                <option value="planned">Planned</option>
                <option value="ready">Ready</option>
                <option value="published">Published</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Planned Publication Date
            </label>
            <input
              type="date"
              value={publicationDate}
              onChange={(e) => setPublicationDate(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Hook / Opening Sentence
            </label>
            <input
              type="text"
              placeholder="e.g. Listen to the blistered crust crackle..."
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-[#6B655F] mb-1">
              Caption Notes & Ingredients to Mention
            </label>
            <textarea
              rows={3}
              value={captionNotes}
              onChange={(e) => setCaptionNotes(e.target.value)}
              className="w-full rounded-xl border border-[#D3C7B6] bg-white px-3 py-2"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex-1 rounded-xl border border-[#D3C7B6] bg-white py-2 font-bold uppercase text-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="touch-target flex-1 rounded-xl bg-[#526043] py-2 font-bold uppercase text-white hover:bg-[#3F4C33]"
            >
              Save Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
