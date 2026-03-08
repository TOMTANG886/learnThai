// web/test/contract/tts-contract.test.ts
// Contract tests for the HTTP TTS provider interface.
// These tests use a mock fetch to verify the provider sends correct requests
// without making real network calls or needing live API credentials.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── test helpers ────────────────────────────────────────────────────────────

function useTempAudioDir(): { dir: string } {
  const ctx = { dir: '' };

  beforeEach(() => {
    ctx.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-contract-'));
    process.env._TTS_AUDIO_DIR_OVERRIDE = ctx.dir;
  });

  afterEach(() => {
    fs.rmSync(ctx.dir, { recursive: true, force: true });
    delete process.env._TTS_AUDIO_DIR_OVERRIDE;
  });

  return ctx;
}

async function loadService() {
  return import('../../src/lib/tts-service');
}

// ─── HTTP provider contract: request shape ───────────────────────────────────

describe('HTTP provider — request contract', () => {
  const ctx = useTempAudioDir();

  beforeEach(() => {
    process.env.TTS_PROVIDER = 'http';
    process.env.TTS_API_URL = 'https://api.example.com/tts';
    process.env.TTS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.TTS_PROVIDER;
    delete process.env.TTS_API_URL;
    delete process.env.TTS_API_KEY;
    vi.restoreAllMocks();
  });

  test('sends POST request to TTS_API_URL', async () => {
    const audioData = Buffer.from('FAKE_MP3_BINARY_DATA');
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => audioData.buffer,
      text: async () => '',
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    await generateAudioForPost('สวัสดีครับ', 'hello-thai', { lang: 'th-TH', voice: 'th-TH-Standard-A' });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/tts');
    expect(init.method).toBe('POST');
  });

  test('includes Authorization: Bearer header with API key', async () => {
    const audioData = Buffer.from('FAKE_AUDIO');
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => audioData.buffer,
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    await generateAudioForPost('ขอบคุณ', 'thank-you');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-api-key');
  });

  test('sends Content-Type: application/json header', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => Buffer.from('audio').buffer,
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    await generateAudioForPost('สวัสดี', 'hello');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  test('sends JSON payload with text, voice, lang, format fields', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => Buffer.from('audio').buffer,
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    await generateAudioForPost('สวัสดีครับ', 'hello-thai', {
      lang: 'th-TH',
      voice: 'th-TH-Standard-A',
      format: 'mp3',
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.text).toBe('สวัสดีครับ');
    expect(body.voice).toBe('th-TH-Standard-A');
    expect(body.lang).toBe('th-TH');
    expect(body.format).toBe('mp3');
  });

  test('defaults format to "mp3" when not specified in opts', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => Buffer.from('audio').buffer,
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    await generateAudioForPost('สวัสดี', 'hello'); // no opts.format

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.format).toBe('mp3');
  });

  test('writes binary audio response to disk as .mp3 file', async () => {
    const fakeAudio = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x01, 0x02]); // fake MP3 header
    // Use a proper standalone ArrayBuffer (not the shared buffer backing a Node Buffer slice)
    const ab = fakeAudio.buffer.slice(
      fakeAudio.byteOffset,
      fakeAudio.byteOffset + fakeAudio.byteLength
    );
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => ab,
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    const result = await generateAudioForPost('แมว', 'cat');

    const filePath = path.join(ctx.dir, `${result.hash}.mp3`);
    expect(fs.existsSync(filePath)).toBe(true);

    const written = fs.readFileSync(filePath);
    expect(Buffer.compare(written, fakeAudio)).toBe(0);
  });

  test('throws with status code when API returns non-2xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Too Many Requests',
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    await expect(generateAudioForPost('สวัสดี', 'hello')).rejects.toThrow(/429/);
  });

  test('error message for non-2xx does NOT include API key', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    let errorMessage = '';
    try {
      await generateAudioForPost('สวัสดี', 'hello');
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    expect(errorMessage).not.toContain('test-api-key');
    expect(errorMessage).toContain('401');
  });

  test('throws with status 503 for service unavailable', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    await expect(generateAudioForPost('สวัสดี', 'hello')).rejects.toThrow(/503/);
  });

  test('rate limit (429) surfaces actionable status code in error', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    await expect(generateAudioForPost('สวัสดี', 'hello')).rejects.toThrow(/429/);
  });
});

// ─── HTTP provider — missing credentials ─────────────────────────────────────

describe('HTTP provider — credential validation', () => {
  const ctx = useTempAudioDir();

  afterEach(() => {
    delete process.env.TTS_PROVIDER;
    delete process.env.TTS_API_URL;
    delete process.env.TTS_API_KEY;
  });

  test('throws if TTS_API_URL is missing', async () => {
    process.env.TTS_PROVIDER = 'http';
    delete process.env.TTS_API_URL;
    process.env.TTS_API_KEY = 'some-key';

    const { generateAudioForPost } = await loadService();
    await expect(generateAudioForPost('สวัสดี', 'hello')).rejects.toThrow(
      /TTS_API_URL.*TTS_API_KEY|http provider/i
    );
  });

  test('throws if TTS_API_KEY is missing', async () => {
    process.env.TTS_PROVIDER = 'http';
    process.env.TTS_API_URL = 'https://api.example.com/tts';
    delete process.env.TTS_API_KEY;

    const { generateAudioForPost } = await loadService();
    await expect(generateAudioForPost('สวัสดี', 'hello')).rejects.toThrow(
      /TTS_API_URL.*TTS_API_KEY|http provider/i
    );
  });
});

// ─── Fallback: non-HTTP modes use local provider ─────────────────────────────

describe('Non-HTTP mode falls back to local provider', () => {
  const ctx = useTempAudioDir();

  afterEach(() => {
    delete process.env.TTS_PROVIDER;
    delete process.env.TTS_API_URL;
    delete process.env.TTS_API_KEY;
    vi.restoreAllMocks();
  });

  test('mock provider does not call fetch', async () => {
    process.env.TTS_PROVIDER = 'mock';
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    await generateAudioForPost('สวัสดี', 'hello');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('mock provider creates output file (local artifact)', async () => {
    process.env.TTS_PROVIDER = 'mock';

    const { generateAudioForPost } = await loadService();
    const result = await generateAudioForPost('ขอบคุณ', 'thank-you');

    const filePath = path.join(ctx.dir, `${result.hash}.mp3`);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('mock provider works without TTS_API_URL or TTS_API_KEY', async () => {
    process.env.TTS_PROVIDER = 'mock';
    delete process.env.TTS_API_URL;
    delete process.env.TTS_API_KEY;

    const { generateAudioForPost } = await loadService();
    await expect(generateAudioForPost('หมา', 'dog')).resolves.toBeDefined();
  });

  test('default provider (no TTS_PROVIDER set) is mock, not http', async () => {
    delete process.env.TTS_PROVIDER;
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const { generateAudioForPost } = await loadService();
    await generateAudioForPost('ปลา', 'fish');

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── Idempotency: HTTP provider respects cache ───────────────────────────────

describe('HTTP provider — cache hit skips API call', () => {
  const ctx = useTempAudioDir();

  beforeEach(() => {
    process.env.TTS_PROVIDER = 'http';
    process.env.TTS_API_URL = 'https://api.example.com/tts';
    process.env.TTS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.TTS_PROVIDER;
    delete process.env.TTS_API_URL;
    delete process.env.TTS_API_KEY;
    vi.restoreAllMocks();
  });

  test('does not call fetch when cached file already exists', async () => {
    const { generateAudioForPost, hashTextForAudio } = await loadService();

    // Pre-populate cache
    const hash = hashTextForAudio('สวัสดี', { lang: 'th-TH' });
    const cachedFile = path.join(ctx.dir, `${hash}.mp3`);
    fs.writeFileSync(cachedFile, 'CACHED_AUDIO');

    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await generateAudioForPost('สวัสดี', 'hello', { lang: 'th-TH' });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.hash).toBe(hash);
  });
});
