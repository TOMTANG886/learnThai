# Implementation Plan: TTS Audio Generation & Playback

**Branch**: `002-tts-audio` | **Date**: 2026-03-08 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-tts-audio/spec.md`

## Summary

Implement an isolated TTS service module (`web/src/lib/tts-service.ts`) that generates audio files from text content at build time, AND a React AudioPlayer component (`web/src/components/AudioPlayer.tsx`) for playback on blog post pages. The service accepts text + voice/lang config, returns audio file path + content hash, caches files by hash in `public/assets/audio/`, and supports both mock (local dev) and HTTP (production) providers. The player component renders HTML5 audio controls and handles loading/error states gracefully. Integrate into existing build pipeline (`web/scripts/build-from-sheets.ts`) with `--generate-audio` flag.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 18+ (for native fetch API), React 18+ (Next.js)  
**Primary Dependencies**: Existing Next.js + Google Sheets infrastructure, Node.js `crypto` module, `fs`, `path`  
**Storage**: Local filesystem (`public/assets/audio/`) for generated audio files  
**Testing**: Vitest for unit tests (mock provider, hashing, component), contract tests for HTTP provider interface  
**Target Platform**: Build-time script (static site generator) + client-side React component  
**Project Type**: Service library module + React component integrated into existing Next.js build pipeline  
**Performance Goals**: Generate/cache 100 audio files in <5 minutes with HTTP provider; audio player loads in <1KB bundle  
**Constraints**: Build-time generation only (no runtime), idempotent (cache hits skip API calls), no credentials in logs, minimal client-side JS  
**Scale/Scope**: ~100-500 posts initially, designed to handle thousands with content-hash caching

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Principle I (Static-First)**: Compliant — audio generation happens at build time only; player uses static assets with no runtime API calls  
✅ **Principle II (Sheets SOT)**: Compliant — text content comes from Google Sheets (existing infrastructure)  
✅ **Principle III (Isolated Services)**: **PRIMARY COMPLIANCE TARGET** — service module has clear interface, testable without external API; player component is isolated with clear props interface  
✅ **Principle IV (Idempotent Pipeline)**: Compliant — content-hash caching ensures idempotency; same input → same output  
✅ **Principle V (Simplicity)**: Compliant — minimal client-side JS (HTML5 audio only, no libraries), single service module, no framework abstraction

**Gates**: All principles satisfied. Service and component interface contracts defined in spec (FR-001 through FR-022).

## Project Structure

### Documentation (this feature)

```text
specs/002-tts-audio/
├── plan.md              # This file
├── spec.md              # Feature specification (updated with US4: Playback)
├── research.md          # Phase 0 output (completed)
├── data-model.md        # Phase 1 output (completed)
├── quickstart.md        # Phase 1 output (completed)
├── contracts/           # Phase 1 output (completed)
│   ├── tts-service-contract.md
│   └── audio-player-contract.md
├── checklists/
│   └── requirements.md  # Validation checklist
└── tasks.md             # Task breakdown (to be updated)
```

### Source Code (integration into existing Next.js project)

```text
web/
├── src/
│   ├── lib/
│   │   └── tts-service.ts       # TTS service module (ALREADY CREATED)
│   └── components/
│       └── AudioPlayer.tsx      # NEW: Audio player component
├── pages/
│   └── worksheets/
│       └── [worksheet].tsx      # MODIFY: integrate AudioPlayer
├── scripts/
│   └── build-from-sheets.ts     # MODIFY: integrate audio generation
├── public/
│   └── assets/
│       └── audio/               # Generated audio files (gitignored except .gitkeep)
├── styles/
│   └── audio-player.css         # NEW: optional player styling
└── test/
    ├── tts-service.test.ts      # NEW: unit tests for service module
    ├── components/
    │   └── AudioPlayer.test.tsx # NEW: unit tests for component
    └── contract/
        └── tts-contract.test.ts # NEW: HTTP provider contract tests
```

**Structure Decision**: Single service module + single React component integrated into existing Next.js build pipeline. No new dependencies required beyond Node.js built-ins and React (already present).

## Implementation Phases

### Phase 1: Service Module Foundation (COMPLETED)

**Status**: ✅ Already implemented at `web/src/lib/tts-service.ts`

- Service module exports `generateAudioForPost` and `hashTextForAudio`
- Mock provider creates placeholder files
- HTTP provider calls external API with POST request
- Content-hash caching prevents redundant API calls
- Auto-creates output directory if missing

### Phase 2: Testing & Validation

- Unit tests for hashing function (deterministic output)
- Unit tests for mock provider (no external API)
- Contract tests for HTTP provider interface
- Integration test with sample Sheet data

### Phase 3: Build Pipeline Integration

- Modify `build-from-sheets.ts` to call `generateAudioForPost` when `--generate-audio` flag present
- Update manifest generation to record `audio` path and `audioHash` for each post
- Add CLI flag parsing for `--generate-audio`
- Update `.env.example` with TTS provider config variables

### Phase 4: Audio Playback Component

- Create `AudioPlayer.tsx` React component with HTML5 audio element
- Implement error handling for missing/failed audio files
- Add accessibility (ARIA labels, keyboard navigation via native controls)
- Optional: add CSS styling for player appearance

### Phase 5: Page Integration

- Modify worksheet page template (`pages/worksheets/[worksheet].tsx`)
- Update `getStaticProps` to include audio path from manifest
- Conditionally render AudioPlayer when audio path exists
- Test end-to-end flow: build → page load → audio playback

### Phase 6: Documentation & Polish

- Update `specs/1-nextjs-static-sheets/quickstart.md` with audio generation steps
- Add `.gitkeep` to `public/assets/audio/` (directory must exist, files gitignored)
- Add npm script: `"build:with-audio": "npm run build:sheets -- --generate-audio && next build"`
- Document environment variables in README
