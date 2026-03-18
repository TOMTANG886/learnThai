// web/test/tts-service.test.ts
// Unit tests for the TTS service module.
// Tests run without any live external API, network, or real TTS credentials.
// Covers: hashing, mock provider, local provider env behavior, caching (idempotency).

import fs from 'fs'
import path from 'path'
import os from 'os'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

// ─── helpers ────────────────────────────────────────────────────────────────

/** Point AUDIO_DIR to a temp directory so tests don't touch public/assets/audio */
function useTempAudioDir(): { dir: string } {
  const ctx = { dir: '' }

  beforeEach(() => {
    ctx.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-test-'))
    process.env._TTS_AUDIO_DIR_OVERRIDE = ctx.dir
  })

  afterEach(() => {
    fs.rmSync(ctx.dir, { recursive: true, force: true })
    delete process.env._TTS_AUDIO_DIR_OVERRIDE
  })

  return ctx
}

// ─── import after env setup ─────────────────────────────────────────────────
// We import the service lazily inside each test so that env vars set in
// beforeEach are picked up. The service reads process.env at call time, so
// static import is safe — we just need to control TTS_PROVIDER before calling.

async function loadService() {
  // Vitest module cache is keyed by resolved path; use dynamic import so
  // we can re-import between provider variants without cache issues.
  // Because vitest doesn't share module state across test files (each test
  // file gets its own module scope), a single dynamic import here is fine.
  return import('../src/lib/tts-service')
}

// ─── hashTextForAudio ────────────────────────────────────────────────────────

describe('hashTextForAudio', () => {
  test('returns a 64-character hex string (SHA-256)', async () => {
    const { hashTextForAudio } = await loadService()
    const hash = hashTextForAudio('สวัสดี')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  test('is deterministic — same text + opts always returns same hash', async () => {
    const { hashTextForAudio } = await loadService()
    const h1 = hashTextForAudio('สวัสดีครับ', { lang: 'th-TH' })
    const h2 = hashTextForAudio('สวัสดีครับ', { lang: 'th-TH' })
    expect(h1).toBe(h2)
  })

  test('returns different hash when text differs', async () => {
    const { hashTextForAudio } = await loadService()
    const h1 = hashTextForAudio('สวัสดี', { lang: 'th-TH' })
    const h2 = hashTextForAudio('ขอบคุณ', { lang: 'th-TH' })
    expect(h1).not.toBe(h2)
  })

  test('returns different hash when lang option differs', async () => {
    const { hashTextForAudio } = await loadService()
    const h1 = hashTextForAudio('สวัสดี', { lang: 'th-TH' })
    const h2 = hashTextForAudio('สวัสดี', { lang: 'en-US' })
    expect(h1).not.toBe(h2)
  })

  test('returns different hash when voice option differs', async () => {
    const { hashTextForAudio } = await loadService()
    const h1 = hashTextForAudio('สวัสดี', { voice: 'th-TH-Standard-A' })
    const h2 = hashTextForAudio('สวัสดี', { voice: 'th-TH-Standard-B' })
    expect(h1).not.toBe(h2)
  })

  test('returns same hash when opts is omitted vs passed as empty object', async () => {
    const { hashTextForAudio } = await loadService()
    const h1 = hashTextForAudio('hello')
    const h2 = hashTextForAudio('hello', {})
    expect(h1).toBe(h2)
  })
})

// ─── mock provider ───────────────────────────────────────────────────────────

describe('generateAudioForPost — mock provider', () => {
  const ctx = useTempAudioDir()

  beforeEach(() => {
    process.env.TTS_PROVIDER = 'mock'
    delete process.env.TTS_API_URL
    delete process.env.TTS_API_KEY
  })

  afterEach(() => {
    delete process.env.TTS_PROVIDER
  })

  test('creates a file in the audio directory', async () => {
    const { generateAudioForPost } = await loadService()
    const result = await generateAudioForPost('สวัสดี', 'hello-thai', { lang: 'th-TH' })

    const expectedFile = path.join(ctx.dir, `${result.hash}.mp3`)
    expect(fs.existsSync(expectedFile)).toBe(true)
  })

  test('returns { path, hash } with correct shape', async () => {
    const { generateAudioForPost } = await loadService()
    const result = await generateAudioForPost('ขอบคุณ', 'thank-you')

    expect(result).toHaveProperty('path')
    expect(result).toHaveProperty('hash')
    expect(result.path).toMatch(/^\/assets\/audio\/.+\.mp3$/)
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/)
  })

  test('path filename matches hash', async () => {
    const { generateAudioForPost } = await loadService()
    const result = await generateAudioForPost('แมว', 'cat')

    expect(result.path).toBe(`/assets/audio/${result.hash}.mp3`)
  })

  test('works without TTS_API_URL or TTS_API_KEY (no credentials needed)', async () => {
    const { generateAudioForPost } = await loadService()
    // Should not throw even though HTTP credentials are absent
    await expect(generateAudioForPost('หมา', 'dog')).resolves.toBeDefined()
  })

  test('is idempotent — second call returns same result without re-creating file', async () => {
    const { generateAudioForPost } = await loadService()
    const r1 = await generateAudioForPost('สวัสดี', 'hello', { lang: 'th-TH' })
    const filePath = path.join(ctx.dir, `${r1.hash}.mp3`)

    // Record mtime of first write
    const mtime1 = fs.statSync(filePath).mtimeMs

    // Wait a tick so mtime would change if re-written
    await new Promise((r) => setTimeout(r, 10))

    const r2 = await generateAudioForPost('สวัสดี', 'hello', { lang: 'th-TH' })
    const mtime2 = fs.statSync(filePath).mtimeMs

    expect(r1.hash).toBe(r2.hash)
    expect(r1.path).toBe(r2.path)
    expect(mtime1).toBe(mtime2) // file not re-written on cache hit
  })

  test('creates audio dir automatically if missing', async () => {
    // Remove the temp dir so the service must recreate it
    fs.rmSync(ctx.dir, { recursive: true, force: true })
    expect(fs.existsSync(ctx.dir)).toBe(false)

    const { generateAudioForPost } = await loadService()
    await generateAudioForPost('ปลา', 'fish')

    expect(fs.existsSync(ctx.dir)).toBe(true)
  })
})

// ─── HTTP provider — missing credentials ────────────────────────────────────

describe('generateAudioForPost — http provider without credentials', () => {
  const ctx = useTempAudioDir()

  beforeEach(() => {
    process.env.TTS_PROVIDER = 'http'
    delete process.env.TTS_API_URL
    delete process.env.TTS_API_KEY
  })

  afterEach(() => {
    delete process.env.TTS_PROVIDER
  })

  test('throws an actionable error when TTS_API_URL is missing', async () => {
    const { generateAudioForPost } = await loadService()
    await expect(generateAudioForPost('สวัสดี', 'hello')).rejects.toThrow(
      /TTS_API_URL.*TTS_API_KEY|http provider/i
    )
  })

  test('error message does NOT include credential values', async () => {
    process.env.TTS_API_KEY = 'super-secret-key-12345'
    const { generateAudioForPost } = await loadService()

    let caughtMessage = ''
    try {
      await generateAudioForPost('สวัสดี', 'hello')
    } catch (e) {
      caughtMessage = (e as Error).message
    }

    expect(caughtMessage).not.toContain('super-secret-key-12345')
  })
})

// ─── unknown provider ────────────────────────────────────────────────────────

describe('generateAudioForPost — unknown provider', () => {
  const ctx = useTempAudioDir()

  beforeEach(() => {
    process.env.TTS_PROVIDER = 'nonexistent-provider-xyz'
  })

  afterEach(() => {
    delete process.env.TTS_PROVIDER
  })

  test('throws with provider name in error message', async () => {
    const { generateAudioForPost } = await loadService()
    await expect(generateAudioForPost('สวัสดี', 'hello')).rejects.toThrow(
      /nonexistent-provider-xyz/i
    )
  })
})
