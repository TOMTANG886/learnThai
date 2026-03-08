// web/test/worksheet.test.ts
// Acceptance tests for the per-worksheet JSON emitted by build-from-sheets.ts.

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { WorksheetData } from '../types';

const WEB_DIR = path.join(__dirname, '..');
const SAMPLE_PATH = path.join(__dirname, '../../specs/1-nextjs-static-sheets/sample_sheet.json');
const PUBLIC_DIR = path.join(WEB_DIR, 'public');
const WORKSHEET_FILE = path.join(PUBLIC_DIR, 'data', 'worksheets', 'phrases.json');

beforeAll(() => {
  const contentDir = path.join(PUBLIC_DIR, 'content');
  const dataDir = path.join(PUBLIC_DIR, 'data');
  if (fs.existsSync(contentDir)) fs.rmSync(contentDir, { recursive: true, force: true });
  if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true, force: true });

  execSync(`npx tsx scripts/build-from-sheets.ts --sample=${SAMPLE_PATH}`, {
    cwd: WEB_DIR,
    stdio: 'pipe',
  });
});

afterAll(() => {
  const contentDir = path.join(PUBLIC_DIR, 'content');
  const dataDir = path.join(PUBLIC_DIR, 'data');
  if (fs.existsSync(contentDir)) fs.rmSync(contentDir, { recursive: true, force: true });
  if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true, force: true });
});

describe('public/data/worksheets/phrases.json', () => {
  let ws: WorksheetData;

  beforeAll(() => {
    ws = JSON.parse(fs.readFileSync(WORKSHEET_FILE, 'utf8')) as WorksheetData;
  });

  test('worksheetName === "Phrases"', () => {
    expect(ws.worksheetName).toBe('Phrases');
  });

  test('worksheetSlug === "phrases"', () => {
    expect(ws.worksheetSlug).toBe('phrases');
  });

  test('columns is an array', () => {
    expect(Array.isArray(ws.columns)).toBe(true);
  });

  test('columns contains "title"', () => {
    expect(ws.columns).toContain('title');
  });

  test('columns contains "slug"', () => {
    expect(ws.columns).toContain('slug');
  });

  test('columns contains "body_markdown"', () => {
    expect(ws.columns).toContain('body_markdown');
  });

  test('columns contains "publish_flag"', () => {
    expect(ws.columns).toContain('publish_flag');
  });

  test('rows.length === 3 (all rows, including drafts)', () => {
    expect(ws.rows.length).toBe(3);
  });

  test('each row has a _slug property', () => {
    for (const row of ws.rows) {
      expect(row).toHaveProperty('_slug');
      expect(typeof row._slug).toBe('string');
    }
  });

  test('row[0]._slug === "hello"', () => {
    expect(ws.rows[0]._slug).toBe('hello');
  });

  test('row[1]._slug === "thank-you"', () => {
    expect(ws.rows[1]._slug).toBe('thank-you');
  });

  test('row[2]._slug === "draft-post"', () => {
    expect(ws.rows[2]._slug).toBe('draft-post');
  });
});
