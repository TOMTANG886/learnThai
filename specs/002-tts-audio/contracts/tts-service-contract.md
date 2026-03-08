# Contract: TTS Service Module Interface

**Feature**: 002-tts-audio  
**Created**: 2026-03-08  
**Module**: `web/src/lib/tts-service.ts`

## Purpose

Define the programmatic interface for the TTS service module that generates audio files from text content during the build process.

---

## Exported Types

### `TtsOptions`

Configuration object for TTS provider behavior.

```typescript
export type TtsOptions = {
  voice?: string;      // Voice identifier (e.g., "th-TH-Standard-A")
  lang?: string;       // Language code (e.g., "th-TH")
  format?: 'mp3' | 'ogg';  // Output format (default: 'mp3')
};
```

**Contract**:
- All fields are optional
- Provider may use defaults when fields are undefined
- `format` MUST be one of the specified literal types

---

## Exported Functions

### `hashTextForAudio(text: string, opts?: TtsOptions): string`

Generate a deterministic SHA-256 content hash for caching.

**Input**:
- `text`: string — Text content to hash (required, non-empty)
- `opts`: TtsOptions — Configuration options (optional)

**Output**:
- Returns: string — 64-character hexadecimal SHA-256 hash

**Behavior**:
- MUST return identical hash for identical input (text + opts)
- MUST return different hash if text OR opts change
- MUST NOT throw errors (hash generation is infallible)

**Example**:
```typescript
const hash1 = hashTextForAudio("สวัสดี", { lang: "th-TH" });
const hash2 = hashTextForAudio("สวัสดี", { lang: "th-TH" });
assert(hash1 === hash2); // Deterministic

const hash3 = hashTextForAudio("สวัสดี", { lang: "en-US" });
assert(hash1 !== hash3); // Different config = different hash
```

---

### `generateAudioForPost(text: string, slug: string, opts?: TtsOptions): Promise<{path: string, hash: string}>`

Generate audio file from text content with content-based caching.

**Input**:
- `text`: string — Text content to convert to audio (required)
- `slug`: string — Post slug for logging/debugging (required)
- `opts`: TtsOptions — Configuration options (optional)

**Output**:
- Returns: Promise<{ path: string, hash: string }>
  - `path`: Public URL path to audio file (e.g., "/assets/audio/abc123.mp3")
  - `hash`: SHA-256 content hash (matches filename)

**Behavior**:
- MUST check cache: if `public/assets/audio/{hash}.mp3` exists, return immediately (no API call)
- MUST create `public/assets/audio/` directory if missing
- MUST use provider from `process.env.TTS_PROVIDER` (default: "mock")
- MUST throw Error with actionable message if provider fails
- MUST NOT log or expose API credentials in any messages
- Mock provider: MUST create placeholder file without external API
- HTTP provider: MUST require `TTS_API_URL` and `TTS_API_KEY` environment variables

**Error Handling**:
- Throws Error if TTS API returns non-2xx status (message includes status code)
- Throws Error if required env vars missing for HTTP provider
- Throws Error if disk write fails
- Does NOT throw if cache hit (returns immediately)

**Example (Mock Provider)**:
```typescript
process.env.TTS_PROVIDER = 'mock';

const result = await generateAudioForPost(
  "สวัสดีครับ",
  "hello-thai",
  { lang: "th-TH" }
);

// result.path === "/assets/audio/a3f2b1c9...mp3"
// result.hash === "a3f2b1c9..." (64 chars)
// File exists at: public/assets/audio/a3f2b1c9...mp3
```

**Example (HTTP Provider)**:
```typescript
process.env.TTS_PROVIDER = 'http';
process.env.TTS_API_URL = 'https://api.example.com/tts';
process.env.TTS_API_KEY = 'secret-key';

const result = await generateAudioForPost(
  "สวัสดีครับ",
  "hello-thai",
  { lang: "th-TH", voice: "th-TH-Standard-A" }
);

// HTTP POST sent to TTS_API_URL with payload:
// { text: "สวัสดีครับ", voice: "th-TH-Standard-A", lang: "th-TH", format: "mp3" }
// Response binary data written to public/assets/audio/{hash}.mp3
```

**Example (Cache Hit)**:
```typescript
// First call: generates file
const result1 = await generateAudioForPost("สวัสดี", "hello", { lang: "th-TH" });

// Second call with identical input: cache hit, no API call
const result2 = await generateAudioForPost("สวัสดี", "hello", { lang: "th-TH" });

assert(result1.hash === result2.hash);
assert(result1.path === result2.path);
// No network request made on second call
```

---

## Environment Variables

### `TTS_PROVIDER`

Provider selection for audio generation.

**Values**:
- `"mock"` (default): Create placeholder files without external API
- `"http"`: Call HTTP-based TTS API

**Required**: No (defaults to "mock")

### `TTS_API_URL`

API endpoint for HTTP provider.

**Example**: `https://texttospeech.googleapis.com/v1/text:synthesize`

**Required**: Yes, if `TTS_PROVIDER=http`

### `TTS_API_KEY`

API authentication key for HTTP provider.

**Example**: `AIzaSyABC123...`

**Required**: Yes, if `TTS_PROVIDER=http`

### `DEFAULT_TTS_VOICE`

Default voice identifier when not specified in TtsOptions.

**Example**: `th-TH-Standard-A`

**Required**: No

---

## File System Contract

### Output Directory

**Location**: `public/assets/audio/`

**Behavior**:
- MUST be created automatically if missing
- Files MUST be named as `{sha256-hash}.mp3`
- Files MUST be read-only after creation (never modified)

### Cache Validation

**Contract**:
- If file with name `{hash}.mp3` exists, it is assumed to be valid
- No content verification performed (hash is trusted)
- Corrupt files must be manually deleted to regenerate

---

## Provider Contract (Extensibility)

To add a new TTS provider:

1. Add provider name to `TTS_PROVIDER` environment variable check
2. Implement provider-specific logic in `generateAudioForPost`:
   ```typescript
   if (provider === 'new-provider') {
     // Call provider API
     // Write binary data to outPath
     return { path: `/assets/audio/${filename}`, hash };
   }
   ```
3. Add required environment variables for provider
4. Update this contract document with new provider section

---

## Testing Contract

### Unit Tests MUST Cover

- `hashTextForAudio` returns deterministic output
- `hashTextForAudio` changes output when input changes
- `generateAudioForPost` with mock provider creates placeholder files
- `generateAudioForPost` reuses cached files (no redundant API calls)
- `generateAudioForPost` throws on HTTP provider without credentials

### Tests MUST NOT Require

- Live external TTS API access
- Network connectivity
- API keys or secrets

### Mock Provider Behavior

**Contract**:
- MUST create file at `public/assets/audio/{hash}.mp3`
- MUST write non-empty content (placeholder text is acceptable)
- MUST NOT make network requests
- MUST return valid `{ path, hash }` result

---

## Versioning

**Current Version**: 1.0  
**Breaking Changes**: Changes to function signatures or return types require major version bump

**Backward Compatibility**:
- Adding optional fields to TtsOptions: minor version bump
- Adding new providers: minor version bump
- Changing hash algorithm: major version bump (breaks caching)

---

## Summary

**Exports**: 2 functions (`hashTextForAudio`, `generateAudioForPost`), 1 type (`TtsOptions`)  
**Environment Variables**: 4 (TTS_PROVIDER, TTS_API_URL, TTS_API_KEY, DEFAULT_TTS_VOICE)  
**File System**: Writes to `public/assets/audio/{hash}.mp3`  
**Providers**: 2 (mock, http), extensible for more  
**Idempotency**: Content-hash caching ensures same input → same output, no redundant work
