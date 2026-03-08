# Data Model: TTS Audio Generation & Playback

**Feature**: 002-tts-audio  
**Created**: 2026-03-08  
**Phase**: 1 (Design)

## Overview

This feature introduces two primary data flows:
1. **Build-time**: Generate audio files from text content and record metadata
2. **Runtime**: Deliver audio file paths to React components for playback

---

## Entities

### TtsOptions (Build-time Configuration)

**Purpose**: Configuration object for TTS service provider

**Fields**:
- `voice?: string` — Voice identifier (e.g., "th-TH-Standard-A" for Google Cloud TTS)
- `lang?: string` — Language code (e.g., "th-TH" for Thai)
- `format?: 'mp3' | 'ogg'` — Audio format (default: 'mp3')

**Usage Context**:
- Passed to `generateAudioForPost` function during build
- Can be set per-post from Sheet column or global env var (`DEFAULT_TTS_VOICE`)

**Validation**:
- All fields optional (provider may have defaults)
- `format` constrained to supported types

**Example**:
```typescript
const opts: TtsOptions = {
  voice: 'th-TH-Standard-A',
  lang: 'th-TH',
  format: 'mp3'
};
```

---

### AudioFile (Build-time Output)

**Purpose**: Generated audio artifact with metadata

**Fields**:
- `path: string` — Public URL path to audio file (e.g., "/assets/audio/abc123.mp3")
- `hash: string` — SHA-256 content hash (used for filename and cache validation)

**Relationships**:
- One-to-one with blog post (each post has at most one audio file)
- File physically stored at `public/assets/audio/{hash}.mp3`

**Validation**:
- `path` must start with "/assets/audio/"
- `hash` must be 64-character hex string (SHA-256)
- File must exist on disk at `public/assets/audio/{hash}.mp3`

**Lifecycle**:
1. Generated during `npm run build:sheets -- --generate-audio`
2. Cached by content hash (idempotent)
3. Recorded in build manifest
4. Served as static asset by web server

**Example**:
```typescript
const audioFile: AudioFile = {
  path: '/assets/audio/a3f2b1c9d4e5f6...mp3',
  hash: 'a3f2b1c9d4e5f6...' // full 64-char hash
};
```

---

### Post (Enhanced with Audio)

**Purpose**: Blog post entity with optional audio field

**New Fields**:
- `audio?: string` — Path to generated audio file (null if audio not generated)
- (Existing fields: `title`, `slug`, `body_markdown`, `publish_flag`, etc.)

**Relationships**:
- Post has optional audio file (one-to-zero-or-one)
- Audio path references AudioFile.path

**Data Flow**:
1. Text content comes from Google Sheets (`body_markdown` column)
2. Build script generates audio from text
3. Audio path stored in post object
4. Post serialized to static JSON/props for page

**Example**:
```typescript
interface Post {
  slug: string;
  title: string;
  body_markdown: string;
  audio?: string; // NEW FIELD
  // ...other fields
}
```

---

### ManifestEntry (Build Manifest Enhancement)

**Purpose**: Build manifest record for each processed post

**New Fields**:
- `audioHash?: string` — Content hash of generated audio (for validation/cache hits)

**Relationships**:
- One-to-one with Post
- References AudioFile.hash

**Usage**:
- Validate cache hits on subsequent builds
- Audit which posts have audio generated
- Debug/troubleshooting build outputs

**Example**:
```json
{
  "slug": "animals",
  "title": "Thai Animals Vocabulary",
  "audioHash": "a3f2b1c9d4e5f6...",
  "processedAt": "2026-03-08T12:34:56Z"
}
```

---

### AudioPlayerProps (Component Interface)

**Purpose**: Props interface for React AudioPlayer component

**Fields**:
- `audioPath: string` — URL path to audio file (required)
- `title?: string` — Post title for ARIA label (optional)
- `className?: string` — CSS class for styling (optional)

**Validation**:
- `audioPath` must be non-empty string
- `audioPath` should start with "/" or "http" (absolute or external URL)

**Usage Context**:
- Passed from page component to AudioPlayer
- Audio path comes from Post.audio field (via getStaticProps)

**Example**:
```typescript
interface AudioPlayerProps {
  audioPath: string;
  title?: string;
  className?: string;
}

// Usage:
<AudioPlayer 
  audioPath="/assets/audio/abc123.mp3" 
  title="Thai Animals Vocabulary" 
/>
```

---

## State Transitions

### Audio File Lifecycle

```
[Sheet Data] 
    ↓ (build-from-sheets.ts)
[Text Content]
    ↓ (TTS Service: generateAudioForPost)
[Audio Binary]
    ↓ (write to disk)
[Audio File: public/assets/audio/{hash}.mp3]
    ↓ (static build: next export)
[Static Asset: deployed to CDN/hosting]
    ↓ (page load: getStaticProps)
[Audio Path in Page Props]
    ↓ (render: AudioPlayer component)
[HTML5 Audio Element]
    ↓ (user interaction: play button)
[Audio Playback]
```

**Key State Points**:
1. **Generation**: Text → Audio File (idempotent via content hash)
2. **Storage**: Memory → Disk (`public/assets/audio/`)
3. **Deployment**: Local disk → Static host/CDN
4. **Delivery**: Static props → React component → Browser

---

## Data Flow Diagrams

### Build-Time Flow

```
Google Sheets
    ↓
[build-from-sheets.ts]
    ├─ Fetch posts
    ├─ For each post:
    │   ├─ Extract text (body_markdown)
    │   ├─ Call generateAudioForPost(text, slug, opts)
    │   │   ├─ Hash text+opts → contentHash
    │   │   ├─ Check cache: public/assets/audio/{hash}.mp3 exists?
    │   │   │   ├─ YES: return cached path
    │   │   │   └─ NO:
    │   │   │       ├─ Call TTS API
    │   │   │       ├─ Write audio binary to disk
    │   │   │       └─ return new path
    │   ├─ Store audio path in post.audio
    │   └─ Store audioHash in manifest entry
    └─ Write manifest.json

Static Site Build (next build)
    ├─ Read manifest.json
    ├─ Generate pages with audio paths in props
    └─ Copy public/assets/audio/* to build output
```

### Runtime Flow (Browser)

```
User visits /worksheets/animals
    ↓
Next.js serves static HTML
    ↓
Page props include: { audio: "/assets/audio/abc123.mp3" }
    ↓
React renders <AudioPlayer audioPath={audio} />
    ↓
HTML5 <audio> element created with src="/assets/audio/abc123.mp3"
    ↓
User clicks Play
    ↓
Browser fetches /assets/audio/abc123.mp3
    ↓
Audio plays
```

---

## Validation Rules

### Audio File Naming

- **Pattern**: `{sha256-hash}.mp3`
- **Example**: `a3f2b1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1.mp3`
- **Rationale**: Content-based naming ensures cache hits for identical content

### Audio File Storage

- **Location**: `public/assets/audio/`
- **Permissions**: Read-only (never modified after generation)
- **Git**: `.gitignore` includes `*.mp3` (files not committed, regenerated on build)

### Post Audio Field

- **Type**: `string | null | undefined`
- **Null**: Audio not generated (e.g., `--generate-audio` flag not used)
- **Undefined**: Same as null (legacy compatibility)
- **String**: Must be valid URL path starting with "/"

---

## Schema Evolution

### Current Schema (v1.0)

```typescript
// web/types/index.ts
export interface Post {
  slug: string;
  title: string;
  body_markdown: string;
  audio?: string; // NEW in v1.0
}

export interface TtsOptions {
  voice?: string;
  lang?: string;
  format?: 'mp3' | 'ogg';
}

export interface AudioFile {
  path: string;
  hash: string;
}

export interface AudioPlayerProps {
  audioPath: string;
  title?: string;
  className?: string;
}
```

### Future Enhancements (Out of Scope)

Potential schema changes for future iterations:

```typescript
// Possible v2.0 additions
export interface Post {
  // ...existing fields
  audio?: string;
  audioMetadata?: {
    duration: number; // seconds
    size: number; // bytes
    voice: string; // voice used
    generatedAt: string; // ISO timestamp
  };
}

export interface AudioPlayerProps {
  // ...existing fields
  showDownload?: boolean; // download button
  playbackRate?: number; // speed control
  autoplay?: boolean; // auto-start
}
```

---

## Summary

**Core Entities**: 5 (TtsOptions, AudioFile, Post, ManifestEntry, AudioPlayerProps)  
**New Fields**: 2 (Post.audio, ManifestEntry.audioHash)  
**State Transitions**: Build-time generation → Storage → Deployment → Runtime playback  
**Validation**: Content-hash naming, path format, type constraints  

All entities support the two-phase workflow: build-time generation and runtime playback.
