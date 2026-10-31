/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JSON Backup / Restore and CSV Export / Import (Section 6, CON09, A10)
 */

import { AppState, storageService } from './storage';
import { ContentItem } from '../types';
import { formatCents, formatDate } from './formatters';

export interface BackupPayload {
  version: '1.0';
  appName: 'Kharis Bake Operations Planner';
  exportedAt: string;
  data: AppState;
}

export function exportBackupJson(): string {
  const state = storageService.getState();
  const backup: BackupPayload = {
    version: '1.0',
    appName: 'Kharis Bake Operations Planner',
    exportedAt: new Date().toISOString(),
    data: state,
  };
  return JSON.stringify(backup, null, 2);
}

export function validateAndPreviewBackup(jsonString: string): {
  valid: boolean;
  error?: string;
  preview?: {
    customersCount: number;
    ordersCount: number;
    sessionsCount: number;
    productsCount: number;
    contentItemsCount: number;
    shotsCount: number;
    exportedAt?: string;
  };
  parsedState?: AppState;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed) return { valid: false, error: 'Empty or invalid JSON.' };

    const data: AppState = parsed.data || parsed;
    if (!Array.isArray(data.orders) || !Array.isArray(data.products) || !Array.isArray(data.bakeSessions)) {
      return { valid: false, error: 'Missing required collections (orders, products, bakeSessions).' };
    }

    return {
      valid: true,
      preview: {
        customersCount: data.customers?.length || 0,
        ordersCount: data.orders?.length || 0,
        sessionsCount: data.bakeSessions?.length || 0,
        productsCount: data.products?.length || 0,
        contentItemsCount: data.contentItems?.length || 0,
        shotsCount: data.shots?.length || 0,
        exportedAt: parsed.exportedAt,
      },
      parsedState: data,
    };
  } catch (err) {
    return { valid: false, error: `Invalid JSON syntax: ${(err as Error).message}` };
  }
}

/**
 * Downloads a text or CSV string as a file
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates CSV for Orders List
 */
export function generateOrdersCsv(): string {
  const state = storageService.getState();
  const headers = [
    'Reference',
    'Bake Date',
    'Customer Name',
    'Customer Phone',
    'Status',
    'Items Summary',
    'Total (SGD)',
    'Paid (SGD)',
    'Balance (SGD)',
    'Collection Window',
    'Notes',
  ];

  const rows = state.orders.map((ord) => {
    const cust = state.customers.find((c) => c.id === ord.customerId);
    const sess = state.bakeSessions.find((s) => s.id === ord.bakeSessionId);
    const paid = ord.payments.reduce((sum, p) => sum + (p.signedAmountCents || 0), 0);
    const balance = ord.totalCents - paid;
    const itemsSummary = ord.items
      .map((it) => `${it.quantity}x ${it.productNameSnapshot}`)
      .join('; ');

    return [
      `"${ord.displayReference}"`,
      `"${sess ? sess.bakeDate : ''}"`,
      `"${cust ? cust.name.replace(/"/g, '""') : 'Unknown'}"`,
      `"${cust?.phone || ''}"`,
      `"${ord.status}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`,
      (ord.totalCents / 100).toFixed(2),
      (paid / 100).toFixed(2),
      (balance / 100).toFixed(2),
      `"${ord.collectionWindow || ''}"`,
      `"${(ord.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generates CSV for Production Bake Sheet
 */
export function generateProductionCsv(sessionId: string): string {
  const state = storageService.getState();
  const sess = state.bakeSessions.find((s) => s.id === sessionId);
  if (!sess) return '';

  const headers = ['Bake Date', 'Product Name', 'Unit Label', 'Confirmed Qty', 'Pending Held Qty', 'Total Qty'];

  const sessionOrders = state.orders.filter((o) => o.bakeSessionId === sessionId);
  const map: Record<string, { name: string; unit: string; confirmed: number; held: number }> = {};

  for (const ord of sessionOrders) {
    const isConfirmed = ord.status === 'confirmed' || ord.status === 'collected';
    const isHeld = ord.status === 'pending';

    for (const item of ord.items) {
      if (!map[item.productId]) {
        const prod = state.products.find((p) => p.id === item.productId);
        map[item.productId] = {
          name: item.productNameSnapshot,
          unit: prod?.unitLabel || 'unit',
          confirmed: 0,
          held: 0,
        };
      }
      if (isConfirmed) map[item.productId].confirmed += item.quantity;
      if (isHeld) map[item.productId].held += item.quantity;
    }
  }

  const rows = Object.values(map).map((row) => {
    return [
      `"${sess.bakeDate}"`,
      `"${row.name.replace(/"/g, '""')}"`,
      `"${row.unit}"`,
      row.confirmed,
      row.held,
      row.confirmed + row.held,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Content CSV Template for import (CON09)
 */
export const CONTENT_CSV_TEMPLATE = `ImportKey,Title,PublicationDate,Channel,Format,Theme,Hook,CaptionNotes,Status
KB-2611-SAMPLE1,"Holiday Sourdough Gift Loaf",2026-11-15,instagram,reels,"Holiday Specials","The gift of fresh sourdough","Special ribbon packaging reminder",idea
KB-2611-SAMPLE2,"How to Store Artisan Sourdough",2026-11-18,instagram,carousel,"Educational","Never put sourdough in the fridge!","Step-by-step room temp vs freezing tips",planned`;

export interface CsvImportRowResult {
  rowNumber: number;
  data?: Partial<ContentItem>;
  error?: string;
}

export function parseContentCsv(csvText: string): {
  results: CsvImportRowResult[];
  validCount: number;
  errorCount: number;
} {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return { results: [{ rowNumber: 1, error: 'CSV file is empty or only contains a header.' }], validCount: 0, errorCount: 1 };
  }

  const results: CsvImportRowResult[] = [];
  const existingItems = storageService.getContentItems();
  const existingKeys = new Set(existingItems.map((i) => i.importKey).filter(Boolean));

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-indexed including header
    const line = lines[i];

    // Simple robust CSV column split considering quoted commas
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' && (c === 0 || line[c - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());

    // Clean quotes
    const cleanCols = cols.map((col) => col.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

    const [importKey, title, publicationDate, channel, format, theme, hook, captionNotes, status] = cleanCols;

    if (!title) {
      results.push({ rowNumber: rowNum, error: 'Missing required field: Title' });
      continue;
    }
    if (!publicationDate || !/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) {
      results.push({ rowNumber: rowNum, error: 'Invalid or missing PublicationDate (format: YYYY-MM-DD)' });
      continue;
    }
    if (importKey && existingKeys.has(importKey)) {
      results.push({ rowNumber: rowNum, error: `Duplicate importKey "${importKey}" already exists in content calendar.` });
      continue;
    }

    const validChannels = ['instagram', 'tiktok', 'whatsapp', 'newsletter'];
    const validFormats = ['reels', 'carousel', 'static', 'story'];
    const validStatuses = ['idea', 'planned', 'ready', 'published', 'skipped'];

    const normalizedChannel = (channel || 'instagram').toLowerCase() as ContentItem['channel'];
    const normalizedFormat = (format || 'reels').toLowerCase() as ContentItem['format'];
    const normalizedStatus = (status || 'planned').toLowerCase() as ContentItem['status'];

    if (!validChannels.includes(normalizedChannel)) {
      results.push({ rowNumber: rowNum, error: `Invalid channel "${channel}". Must be one of: ${validChannels.join(', ')}` });
      continue;
    }

    results.push({
      rowNumber: rowNum,
      data: {
        importKey: importKey || undefined,
        title,
        publicationDate,
        channel: normalizedChannel,
        format: normalizedFormat,
        theme: theme || 'General',
        hook: hook || '',
        captionNotes: captionNotes || '',
        status: normalizedStatus,
        productIds: [],
      },
    });
  }

  const validCount = results.filter((r) => !r.error).length;
  const errorCount = results.filter((r) => !!r.error).length;

  return { results, validCount, errorCount };
}
