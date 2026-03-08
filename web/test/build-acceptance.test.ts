// web/test/build-acceptance.test.ts
// End-to-end acceptance test for the build-from-sheets.ts pipeline.

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const WEB_DIR = path.join(__dirname, '..');
const SAMPLE_PATH = path.join(__dirname, '../../specs/1-nextjs-static-sheets/sample_sheet.json');
const PUBLIC_DIR = path.join(WEB_DIR, 'public');
const WORKSHEETS_DIR = path.join(PUBLIC_DIR, 'data', 'worksheets');
const MANIFEST_PATH = path.join(PUBLIC_DIR, 'data', 'manifest.json');

beforeAll(() => {
  const dataDir = path.join(PUBLIC_DIR, 'data');
  if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true, force: true });

  execSync(`npx tsx scripts/build-from-sheets.ts --sample=${SAMPLE_PATH}`, {
    cwd: WEB_DIR,
    stdio: 'pipe',
  });
});

afterAll(() => {
  const dataDir = path.join(PUBLIC_DIR, 'data');
  if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true, force: true });
});

test('public/data/worksheets/phrases.json exists', () => {
  expect(fs.existsSync(path.join(WORKSHEETS_DIR, 'phrases.json'))).toBe(true);
});

test('public/data/worksheets/phrases.json has columns and rows arrays with 3 rows (all rows)', () => {
  const ws = JSON.parse(fs.readFileSync(path.join(WORKSHEETS_DIR, 'phrases.json'), 'utf8'));
  expect(Array.isArray(ws.columns)).toBe(true);
  expect(Array.isArray(ws.rows)).toBe(true);
  expect(ws.rows.length).toBe(3);
});

test('public/data/manifest.json exists', () => {
  expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
});

test('manifest.json has a worksheets array with 1 entry', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  expect(Array.isArray(manifest.worksheets)).toBe(true);
  expect(manifest.worksheets.length).toBe(1);
});


