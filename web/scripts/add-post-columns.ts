// web/scripts/add-post-columns.ts
// Adds post columns (title, slug, body_markdown, publish_flag) to all worksheets
// that are missing them, using the Google Sheets API with write access.
//
// Usage:
//   tsx scripts/add-post-columns.ts [--dry-run]
//
// Options:
//   --dry-run   Preview what would be changed without writing to the sheet
//
// Environment variables:
//   GOOGLE_SHEET_ID                 Google Sheet ID
//   GOOGLE_SERVICE_ACCOUNT_PATH     Path to service account JSON (default: ./credential.json)
//   GOOGLE_SERVICE_ACCOUNT_JSON     Service account JSON as string (CI-friendly)

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const POST_COLUMNS = ['title', 'slug', 'body_markdown', 'publish_flag'];

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
 * Convert a 1-based column index to a letter (1→A, 26→Z, 27→AA, etc.)
 */
function columnLetter(n: number): string {
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/**
 * Returns an authenticated Google Sheets client with write access.
 */
async function getSheetsClient() {
  let credentials: object;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else {
    const credPath = path.resolve(
      process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './credential.json'
    );
    credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  }

  const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  return google.sheets({ version: 'v4', auth });
}

async function main(): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    console.error('[add-post-columns] GOOGLE_SHEET_ID is required.');
    process.exit(1);
  }

  console.log(`[add-post-columns] Sheet ID: ${sheetId}`);
  if (dryRun) console.log('[add-post-columns] DRY RUN — no changes will be written.\n');

  const sheets = await getSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const worksheetNames = (meta.data.sheets || []).map((s) => s.properties?.title ?? '');
  console.log(
    `[add-post-columns] Found ${worksheetNames.length} worksheets: ${worksheetNames.join(', ')}\n`
  );

  for (const name of worksheetNames) {
    console.log(`── Processing: "${name}"`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: name,
    });

    const values = response.data.values || [];
    if (values.length === 0) {
      console.log(`   ⚠ Skipping — worksheet is empty.\n`);
      continue;
    }

    const existingHeaders = values[0].map((h) => String(h).trim());
    const normalHeaders = existingHeaders.map((h) => h.toLowerCase());
    const missingCols = POST_COLUMNS.filter((c) => !normalHeaders.includes(c));

    if (missingCols.length === 0) {
      console.log(`   ✓ Already has all post columns. Skipping.\n`);
      continue;
    }

    console.log(`   + Adding columns: ${missingCols.join(', ')}`);

    const newHeaders = [...existingHeaders, ...missingCols];
    const dataRows = values.slice(1);
    const firstTextColIdx = 0;

    const updatedRows = dataRows.map((row) => {
      const extended: string[] = row.slice(0, existingHeaders.length).map(String);
      while (extended.length < existingHeaders.length) extended.push('');

      for (const col of missingCols) {
        if (col === 'slug') {
          const source = row[firstTextColIdx] ? String(row[firstTextColIdx]) : '';
          extended.push(generateSlug(source));
        } else if (col === 'publish_flag') {
          extended.push('true');
        } else {
          extended.push('');
        }
      }
      return extended;
    });

    const updatedValues = [newHeaders, ...updatedRows];

    if (dryRun) {
      console.log(`   [dry-run] Would update ${updatedRows.length} rows.`);
      console.log(`   [dry-run] New headers: ${newHeaders.join(', ')}\n`);
      continue;
    }

    const endCol = columnLetter(newHeaders.length);
    const endRow = updatedValues.length;
    const range = `${name}!A1:${endCol}${endRow}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: updatedValues },
    });

    console.log(
      `   ✓ Updated "${name}" — ${updatedRows.length} rows, new headers: ${newHeaders.join(', ')}\n`
    );
  }

  console.log('[add-post-columns] Done.');
}

main().catch((err) => {
  console.error('[add-post-columns] Fatal error:', (err as Error).message);
  process.exit(1);
});
