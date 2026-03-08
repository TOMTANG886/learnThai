// web/scripts/build-from-sheets.ts
// Main build orchestrator: fetches Google Sheets data (or reads local JSON),
// validates schema, emits per-worksheet JSON files, and a build manifest.
//
// Usage:
//   tsx scripts/build-from-sheets.ts [options]
//
// Options:
//   --fetch-assets          Download audio assets from audio_url column into public/assets/audio/
//   --auth=service-account  Use service account auth (default)
//   --auth=api-key          Use API key auth (GOOGLE_API_KEY env var)
//   --sample=<path>         Use a local JSON file instead of fetching from Sheets
//
// Environment variables:
//   GOOGLE_SHEET_ID                 Google Sheet ID
//   GOOGLE_SERVICE_ACCOUNT_PATH     Path to service account JSON (default: ./credential.json)
//   GOOGLE_SERVICE_ACCOUNT_JSON     Service account JSON as string (CI-friendly)
//   WORKSHEET_NAME                  Comma-separated worksheet name(s) to fetch (optional)

import dotenv from 'dotenv';
import path from 'path';

// Load .env.local (and .env) for local development
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import fs from 'fs';
import crypto from 'crypto';
import { fetchWorksheet, listWorksheets } from './sheets-client';
import type { BuildManifest, SheetData, WorksheetMeta, GeneratedFile } from '../types';

// Parse CLI args
const args = process.argv.slice(2);
const fetchAssets = args.includes('--fetch-assets');
const authMode = (args.find((a) => a.startsWith('--auth=')) ?? '--auth=service-account').replace(
  '--auth=',
  ''
);
const sampleArg = args.find((a) => a.startsWith('--sample='));
const samplePath = sampleArg ? sampleArg.replace('--sample=', '') : null;

// Paths
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const POSTS_DIR = path.join(PUBLIC_DIR, 'content', 'posts');
const WORKSHEETS_DIR = path.join(PUBLIC_DIR, 'data', 'worksheets');
const MANIFEST_DIR = path.join(PUBLIC_DIR, 'data');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets', 'audio');

/**
 * Generate a URL-friendly slug from a string.
 */
function generateSlug(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Compute a SHA-256 content hash for a JavaScript value.
 */
function contentHash(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Write JSON to a file, creating directories as needed.
 */
function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Load sheet data: either from a local JSON file (--sample) or from Google Sheets API.
 */
async function loadSheetData(): Promise<SheetData[]> {
  if (samplePath) {
    const resolved = path.resolve(samplePath);
    console.log(`[build] Loading sample data from ${resolved}`);
    const raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));

    if (Array.isArray(raw)) {
      return raw as SheetData[];
    }
    return Object.entries(raw as Record<string, { headers?: string[]; rows?: Record<string, string>[] }>).map(
      ([worksheetName, data]) => ({
        worksheetName,
        headers: data.headers ?? [],
        rows: data.rows ?? [],
      })
    );
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    console.error('[build] GOOGLE_SHEET_ID is required. Set it in .env or environment.');
    process.exit(1);
  }

  const worksheetEnv = process.env.WORKSHEET_NAME;
  let worksheetNames: string[];

  if (worksheetEnv) {
    worksheetNames = worksheetEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    console.log('[build] No WORKSHEET_NAME set — fetching all worksheets...');
    worksheetNames = await listWorksheets(sheetId);
  }

  console.log(`[build] Fetching worksheets: ${worksheetNames.join(', ')}`);
  const results: SheetData[] = [];
  for (const name of worksheetNames) {
    console.log(`[build] Fetching "${name}"...`);
    const { headers, rows } = await fetchWorksheet(sheetId, name);
    results.push({ worksheetName: name, headers, rows });
  }
  return results;
}

/**
 * Process a single worksheet's data.
 */
function processWorksheet(
  worksheetName: string,
  headers: string[],
  rows: Record<string, string>[],
  manifest: BuildManifest
): void {
  const worksheetSlug = generateSlug(worksheetName);
  const generatedFiles: GeneratedFile[] = [];

  const publishedRows = rows.filter(
    (row) => (row['publish_flag'] ?? '').trim().toUpperCase() === 'TRUE'
  );

  const worksheetData = {
    worksheetName,
    worksheetSlug,
    columns: headers,
    rows: publishedRows.map((row) => ({
      ...row,
      _slug: row['slug'] ? row['slug'].trim() : generateSlug(row['title'] ?? ''),
    })),
  };

  const worksheetFile = path.join(WORKSHEETS_DIR, `${worksheetSlug}.json`);
  writeJson(worksheetFile, worksheetData);

  const wsHash = contentHash(worksheetData);
  generatedFiles.push({ path: `public/data/worksheets/${worksheetSlug}.json`, hash: wsHash });
  console.log(
    `[build]   ✓ worksheet: ${worksheetSlug} (${publishedRows.length}/${rows.length} rows published)`
  );

  const wsMeta: WorksheetMeta = { worksheetName, worksheetSlug, rowCount: publishedRows.length };
  manifest.worksheets.push(wsMeta);
  manifest.generated_files.push(...generatedFiles);
}

/**
 * Download audio assets referenced in rows (--fetch-assets flag).
 */
async function downloadAssets(allWorksheets: SheetData[]): Promise<void> {
  for (const { rows } of allWorksheets) {
    for (const row of rows) {
      const url = row['audio_url'];
      if (!url || !url.startsWith('http')) continue;
      const filename = path.basename(new URL(url).pathname);
      const dest = path.join(ASSETS_DIR, filename);
      if (fs.existsSync(dest)) continue;
      console.log(`[build] Downloading asset: ${url}`);
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          console.warn(`[build] Asset download failed (${resp.status}): ${url}`);
          continue;
        }
        const buf = Buffer.from(await resp.arrayBuffer());
        fs.mkdirSync(ASSETS_DIR, { recursive: true });
        fs.writeFileSync(dest, buf);
      } catch (err) {
        console.warn(`[build] Asset download error: ${(err as Error).message}`);
      }
    }
  }
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  console.log('[build] Starting build-from-sheets...');
  console.log(`[build] Auth mode: ${authMode}`);

  [POSTS_DIR, WORKSHEETS_DIR, MANIFEST_DIR, ASSETS_DIR].forEach((d) =>
    fs.mkdirSync(d, { recursive: true })
  );

  const runId = crypto.randomUUID();
  const manifest: BuildManifest = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    source: samplePath ? `sample:${samplePath}` : `sheets:${process.env.GOOGLE_SHEET_ID}`,
    worksheets: [],
    generated_files: [],
    errors: [],
  };

  const allWorksheets = await loadSheetData();

  for (const { worksheetName, headers, rows } of allWorksheets) {
    console.log(
      `[build] Processing worksheet: "${worksheetName}" (${rows.length} rows, ${headers.length} columns)`
    );
    processWorksheet(worksheetName, headers, rows, manifest);
  }

  if (fetchAssets) {
    console.log('[build] Downloading assets (--fetch-assets)...');
    await downloadAssets(allWorksheets);
  }

  const manifestFile = path.join(MANIFEST_DIR, 'manifest.json');
  writeJson(manifestFile, manifest);
  console.log(`[build] ✓ manifest written: ${manifestFile}`);

  console.log(`[build] Build complete.`);
  console.log(`[build]   Worksheets: ${manifest.worksheets.length}`);
  console.log(`[build]   Generated files: ${manifest.generated_files.length}`);
}

main().catch((err) => {
  console.error('[build] Fatal error:', (err as Error).message);
  process.exit(1);
});
