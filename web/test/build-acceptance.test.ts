// web/test/build-acceptance.test.ts
// End-to-end acceptance test for the build-from-sheets.ts pipeline.

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const WEB_DIR = path.join(__dirname, '..');
const SAMPLE_PATH = path.join(__dirname, '../../specs/1-nextjs-static-sheets/sample_sheet.json');
const PUBLIC_DIR = path.join(WEB_DIR, 'public');
const POSTS_DIR = path.join(PUBLIC_DIR, 'content', 'posts');
const WORKSHEETS_DIR = path.join(PUBLIC_DIR, 'data', 'worksheets');
const MANIFEST_PATH = path.join(PUBLIC_DIR, 'data', 'manifest.json');

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

test('public/content/posts/hello.json exists', () => {
  expect(fs.existsSync(path.join(POSTS_DIR, 'hello.json'))).toBe(true);
});

test('public/content/posts/thank-you.json exists', () => {
  expect(fs.existsSync(path.join(POSTS_DIR, 'thank-you.json'))).toBe(true);
});

test('public/content/posts/draft-post.json does NOT exist (publish_flag=false)', () => {
  expect(fs.existsSync(path.join(POSTS_DIR, 'draft-post.json'))).toBe(false);
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

test('hello.json has the expected structure', () => {
  const post = JSON.parse(fs.readFileSync(path.join(POSTS_DIR, 'hello.json'), 'utf8'));
  expect(post.slug).toBe('hello');
  expect(post.title).toBe('Hello');
  expect(post.worksheetSlug).toBe('phrases');
  expect(post.worksheetName).toBe('Phrases');
  expect(post.tags).toEqual(['greeting', 'basic']);
  expect(post.audio_url).toBe('https://example.com/audio/hello.mp3');
  expect(post.date).toBe('2024-01-01');
  expect(post.author).toBe('Pan');
  expect(typeof post.body_markdown).toBe('string');
  expect(post.body_markdown.length).toBeGreaterThan(0);
});
