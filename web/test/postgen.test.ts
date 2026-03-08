// web/test/postgen.test.ts
// Unit tests for post generation logic and slug behaviour.

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const WEB_DIR = path.join(__dirname, '..');
const SAMPLE_PATH = path.join(__dirname, '../../specs/1-nextjs-static-sheets/sample_sheet.json');
const POSTS_DIR = path.join(WEB_DIR, 'public', 'content', 'posts');
const PUBLIC_DIR = path.join(WEB_DIR, 'public');

/**
 * Inline slug generation that replicates build-from-sheets.ts generateSlug().
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

describe('generateSlug (inline replication)', () => {
  test('"Hello World" → "hello-world"', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  test('"Thai: สวัสดี" → "thai" (non-ASCII stripped)', () => {
    expect(generateSlug('Thai: สวัสดี')).toBe('thai');
  });

  test('"  Leading Spaces  " → "leading-spaces"', () => {
    expect(generateSlug('  Leading Spaces  ')).toBe('leading-spaces');
  });

  test('empty string → ""', () => {
    expect(generateSlug('')).toBe('');
  });
});

describe('build-from-sheets.ts --sample output', () => {
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

  test('produces public/content/posts/hello.json for published post', () => {
    expect(fs.existsSync(path.join(POSTS_DIR, 'hello.json'))).toBe(true);
  });

  test('produces public/content/posts/thank-you.json for published post', () => {
    expect(fs.existsSync(path.join(POSTS_DIR, 'thank-you.json'))).toBe(true);
  });

  test('does NOT produce public/content/posts/draft-post.json (publish_flag=false)', () => {
    expect(fs.existsSync(path.join(POSTS_DIR, 'draft-post.json'))).toBe(false);
  });

  test('hello.json has correct slug, title, and tags', () => {
    const post = JSON.parse(fs.readFileSync(path.join(POSTS_DIR, 'hello.json'), 'utf8'));
    expect(post.slug).toBe('hello');
    expect(post.title).toBe('Hello');
    expect(post.tags).toEqual(['greeting', 'basic']);
  });

  test('hello.json has body_markdown with Thai content', () => {
    const post = JSON.parse(fs.readFileSync(path.join(POSTS_DIR, 'hello.json'), 'utf8'));
    expect(post.body_markdown).toContain('สวัสดี');
  });
});
