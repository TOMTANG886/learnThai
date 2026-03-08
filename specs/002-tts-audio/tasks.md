# Tasks: TTS Audio Generation Service

**Input**: Design documents from `/specs/002-tts-audio/`  
**Prerequisites**: [plan.md](plan.md) ✅, [spec.md](spec.md) ✅  
**Feature**: Isolated TTS service module with mock and HTTP providers

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are absolute from repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project structure and dependencies

- [X] T001 Verify `web/src/lib/` directory exists for service module
- [X] T002 [P] Verify `web/public/assets/audio/` directory exists (create if missing)
- [X] T003 [P] Add `.gitkeep` to `web/public/assets/audio/` and add `*.mp3` to `.gitignore`
- [X] T004 [P] Update `web/.env.example` with TTS configuration variables (TTS_PROVIDER, TTS_API_URL, TTS_API_KEY, DEFAULT_TTS_VOICE)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service module that all user stories depend on

**⚠️ CRITICAL**: Service module already exists at `web/src/lib/tts-service.ts` - validate completeness

- [X] T005 Validate `web/src/lib/tts-service.ts` exports `generateAudioForPost` function
- [X] T006 Validate `web/src/lib/tts-service.ts` exports `hashTextForAudio` function
- [X] T007 Validate `web/src/lib/tts-service.ts` exports `TtsOptions` type
- [X] T008 Validate service creates `public/assets/audio/` directory if missing (ensureAudioDir)
- [X] T009 Validate content-hash caching logic (skip API call if file exists)

**Checkpoint**: Service module interface validated - user story implementation can now begin

---

## Phase 3: User Story 1 - Build Pipeline Audio Generation (Priority: P1) 🎯 MVP

**Goal**: Enable audio generation during build with `--generate-audio` flag, cache by content hash

**Independent Test**: Run `npm run build:sheets -- --generate-audio` with sample Sheet data, verify audio files created in `public/assets/audio/` with hash-based filenames, run again and confirm cache hits

### Implementation for User Story 1

- [X] T010 [US1] Read existing `web/scripts/build-from-sheets.ts` to understand post processing loop
- [X] T011 [US1] Import `generateAudioForPost` from `../src/lib/tts-service` in `web/scripts/build-from-sheets.ts`
- [X] T012 [US1] Add CLI flag parsing for `--generate-audio` argument in `web/scripts/build-from-sheets.ts`
- [X] T013 [US1] Add audio generation call inside post-processing loop in `web/scripts/build-from-sheets.ts` (after translation, before writing manifest)
- [X] T014 [US1] Pass `post.body_markdown` text, `post.slug`, and TtsOptions config to `generateAudioForPost`
- [X] T015 [US1] Store returned `path` as `post.audio` and `hash` as `manifestEntry.audioHash`
- [X] T016 [US1] Add try/catch around audio generation with actionable error messages
- [X] T017 [US1] Update manifest schema to include `audioHash` field in `web/scripts/build-from-sheets.ts`
- [X] T018 [US1] Add npm script `"build:with-audio"` to `web/package.json`: `"npm run build:sheets -- --generate-audio && npm run build"`
- [X] T019 [US1] Test with sample Sheet: run build with `--generate-audio`, verify audio files created
- [X] T020 [US1] Test cache hit: run build again with same data, verify no API calls and files reused

**Checkpoint**: Build pipeline generates and caches audio files - User Story 1 fully functional

---

## Phase 4: User Story 2 - Local Provider for Development (Priority: P2)

**Goal**: Enable local development without production credentials using local provider modes (`mock` and script-based local generation)

**Independent Test**: Run build with `TTS_PROVIDER=mock` and `TTS_PROVIDER=local-gtts` (separately) without production HTTP credentials; verify local outputs are created and build completes.

### Tests for User Story 2

- [X] T021 [P] [US2] Create unit test file `web/test/tts-service.test.ts`
- [X] T022 [P] [US2] Write test: local provider creates local output files in `web/test/tts-service.test.ts`
- [X] T023 [P] [US2] Write test: local providers work without `TTS_API_URL` or `TTS_API_KEY` in `web/test/tts-service.test.ts`
- [X] T024 [P] [US2] Write test: hashTextForAudio returns deterministic SHA-256 hash in `web/test/tts-service.test.ts`
- [X] T025 [P] [US2] Write test: identical text+config produces identical hash in `web/test/tts-service.test.ts`

### Implementation for User Story 2

- [X] T026 [US2] Verify local provider implementations (`mock` and `local-gtts`) in `web/src/lib/tts-service.ts`
- [X] T027 [US2] Run unit tests with `npm test -- tts-service.test.ts`, verify all pass
- [ ] T028 [US2] Test end-to-end: set `TTS_PROVIDER=mock`, run build with `--generate-audio`, verify success
- [ ] T029 [US2] Test end-to-end: set `TTS_PROVIDER=local-gtts`, run build with `--generate-audio`, verify success

**Checkpoint**: Local providers enable development without production credentials - User Story 2 fully functional

---

## Phase 5: User Story 3 - HTTP Provider Integration (Priority: P3)

**Goal**: Support production HTTP provider while enforcing fallback to Local Provider when HTTP mode is not enabled

**Independent Test**: Run with `TTS_PROVIDER=http` and valid credentials (success), run with invalid HTTP config (fail-fast), and run without HTTP mode (fallback to Local Provider).

### Tests for User Story 3

- [X] T030 [P] [US3] Create contract test file `web/test/contract/tts-contract.test.ts`
- [X] T031 [P] [US3] Write contract test: HTTP provider sends POST with text, voice, lang parameters in `web/test/contract/tts-contract.test.ts`
- [X] T032 [P] [US3] Write contract test: HTTP provider includes Authorization header with API key in `web/test/contract/tts-contract.test.ts`
- [X] T033 [P] [US3] Write contract test: HTTP provider handles 200 OK with binary audio data in `web/test/contract/tts-contract.test.ts`
- [X] T034 [P] [US3] Write contract test: non-HTTP mode falls back to Local Provider in `web/test/contract/tts-contract.test.ts`

### Implementation for User Story 3

- [X] T035 [US3] Verify HTTP provider implementation in `web/src/lib/tts-service.ts` (already exists, validate behavior)
- [X] T036 [US3] Verify HTTP provider reads `TTS_API_URL` and `TTS_API_KEY` from env vars
- [X] T037 [US3] Verify HTTP provider validates required env vars and throws clear error if missing
- [X] T038 [US3] Verify HTTP provider handles binary response and writes to disk
- [X] T039 [US3] Test with mock HTTP server: simulate API responses, verify file creation
- [X] T040 [US3] Verify error messages include status code but NOT API credentials
- [X] T041 [US3] Enforce fallback behavior in `web/src/lib/tts-service.ts` when HTTP mode is not enabled
- [X] T042 [US3] Add HTTP timeout handling test coverage in `web/test/contract/tts-contract.test.ts`
- [X] T043 [US3] Add HTTP 429/rate-limit behavior test in `web/test/contract/tts-contract.test.ts`
- [X] T044 [US3] Validate provider-mode selection logic in `web/src/lib/tts-service.ts`
- [X] T045 [US3] Validate `TTS_PROVIDER=http` requires `TTS_API_URL` and `TTS_API_KEY` in `web/src/lib/tts-service.ts`
- [X] T046 [US3] Validate non-HTTP modes never call HTTP request path in `web/src/lib/tts-service.ts`
- [X] T047 [US3] Add explicit actionable config error messaging in `web/src/lib/tts-service.ts`
- [X] T048 [US3] Add contract assertion for fallback-to-local when HTTP is not enabled in `web/test/contract/tts-contract.test.ts`
- [ ] T049 [US3] Add production provider setup example in `specs/002-tts-audio/quickstart.md`
- [ ] T050 [US3] Add fallback behavior example (`non-HTTP => local`) in `specs/002-tts-audio/quickstart.md`

**Checkpoint**: HTTP provider + Local fallback behavior are fully functional for User Story 3

---

## Phase 6: User Story 4 - Audio Playback Component (Priority: P1) 🎯 ESSENTIAL

**Goal**: Enable visitors to play generated audio files on blog post pages via HTML5 audio player

**Independent Test**: Open any blog post page, verify audio player renders, clicking play loads and plays audio with visible progress

### Implementation for User Story 4

- [X] T051 [P] [US4] Create `web/src/components/` directory if missing
- [X] T052 [US4] Create `AudioPlayer.tsx` component file in `web/src/components/`
- [X] T053 [US4] Implement AudioPlayerProps interface (audioPath, title?, className?)
- [X] T054 [US4] Implement AudioPlayer component with HTML5 `<audio>` element and `controls` attribute
- [X] T055 [US4] Add `<source>` element with src={audioPath} and type="audio/mpeg"
- [X] T056 [US4] Add fallback text for browsers without audio support
- [X] T057 [US4] Add aria-label with post title for accessibility
- [X] T058 [US4] Add error state handling (useState + onError callback)
- [X] T059 [US4] Add error message UI when audio fails to load
- [X] T060 [US4] Add preload="metadata" attribute for better UX
- [X] T061 [US4] Import AudioPlayer component in `web/pages/worksheets/[worksheet].tsx`
- [X] T062 [US4] Update getStaticProps to include `audio: post.audio || null` in returned props
- [X] T063 [US4] Add conditional rendering `{audio && <AudioPlayer audioPath={audio} title={title} />}` in page component
- [ ] T064 [US4] Test: build site with `npm run build`, visit /worksheets/animals, verify player renders
- [ ] T065 [US4] Test: click play button, verify audio loads and plays with progress updates
- [ ] T066 [US4] Test: delete audio file, reload page, verify error message displays

### Tests for User Story 4 (Optional)

- [X] T067 [P] [US4] Create test file `web/test/components/AudioPlayer.test.tsx`
- [X] T068 [P] [US4] Write test: component renders with required audioPath prop
- [X] T069 [P] [US4] Write test: component includes audio element with controls attribute
- [X] T070 [P] [US4] Write test: component includes source element with correct src and type
- [X] T071 [P] [US4] Write test: component includes aria-label with title
- [X] T072 [P] [US4] Write test: error state displays user-friendly message

**Checkpoint**: Audio player component renders on pages and plays audio - User Story 4 fully functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final integration

- [ ] T073 [P] Update `specs/1-nextjs-static-sheets/quickstart.md` with audio generation instructions
- [ ] T074 [P] Add "Audio Generation" section to `web/README.md` documenting env vars and usage
- [ ] T075 [P] Document TTS_PROVIDER options (mock vs http) in README
- [ ] T076 [P] Add example .env configuration for both providers in README
- [X] T077 [P] Create optional `web/styles/audio-player.css` with example player styling
- [ ] T078 [P] Add audio player styling section to quickstart.md
- [X] T079 Run full build end-to-end with mock provider, verify no errors
- [X] T080 Run full test suite (`npm test`), verify all tests pass
- [ ] T081 Validate success criteria from spec.md against implementation (SC-001 through SC-011)
- [X] T082 Code review: check no credentials logged, error messages are actionable
- [ ] T083 Final checkpoint: run quickstart.md steps and validate all scenarios work

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Setup (Phase 1)**: Start immediately - prepares directories and config
2. **Foundational (Phase 2)**: Depends on Setup - validates existing service module - BLOCKS all user stories
3. **User Story 1 (Phase 3)**: Depends on Foundational - MVP build pipeline functionality
4. **User Story 2 (Phase 4)**: Depends on Foundational - can run in parallel with US1 or after
5. **User Story 3 (Phase 5)**: Depends on Foundational - can run in parallel with US1/US2 or after
6. **User Story 4 (Phase 6)**: Depends on US1 completion (audio files must be generated) - ESSENTIAL for user-facing functionality
7. **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - MVP ready after completion (build-time audio generation)
- **User Story 2 (P2)**: No dependencies on US1 - can develop/test independently
- **User Story 3 (P3)**: No dependencies on US1/US2 - can develop/test independently
- **User Story 4 (P1)**: DEPENDS on US1 - audio files must exist for playback testing; component itself can be built in parallel

### Within Each User Story

- **User Story 1**: T010 → T011 → T012 → T013-T017 (parallel) → T018-T020 (sequential validation)
- **User Story 2**: T021-T025 (parallel tests) → T026-T029 (sequential validation)
- **User Story 3**: T030-T034 (parallel tests) → T035-T040 (sequential validation)
- **User Story 4**: T051 → T052-T060 (parallel component implementation) → T061-T063 (integration) → T064-T066 (validation) → T067-T072 (parallel tests, optional)

### Parallel Opportunities

**Phase 1 Setup** (all parallel):
- T002, T003, T004 can run together (different files)

**Phase 2 Foundational** (sequential validation):
- T005-T009 validate existing code (run sequentially)

**Phase 4 User Story 2 Tests** (all parallel):
- T021-T025 create different test cases (can run together)

**Phase 5 User Story 3 Tests** (all parallel):
- T030-T034 create different contract tests (can run together)

**Phase 6 User Story 4 Component** (many parallel):
- T052-T060 implement component features (can run together after T051)
- T067-T072 create component tests (can run together)

**Phase 7 Polish** (many parallel):
- T073-T078 update different docs (can run together)

**Cross-Story Parallel**:
- Once Phase 2 complete, can work on US1, US2, US3 simultaneously with different developers
- US4 component can be built in parallel with US2/US3, but integration/testing requires US1 completion

---

## Parallel Example: User Story 1

```bash
# After T012 completes, these can run in parallel:
T013: Add audio generation call in build-from-sheets.ts
T014: Pass text/slug/opts to generateAudioForPost
T015: Store returned path and hash
T016: Add error handling
T017: Update manifest schema
```

---

## Parallel Example: User Story 2

```bash
# All test creation tasks run in parallel:
T021: Create test file
T022: Write test for mock placeholder creation
T023: Write test for missing credentials
T024: Write test for deterministic hashing
T025: Write test for identical hash from same input
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 4)

1. **Phase 1**: Setup (T001-T004) - ~10 minutes
2. **Phase 2**: Foundational validation (T005-T009) - ~15 minutes
3. **Phase 3**: User Story 1 implementation (T010-T020) - ~2 hours
4. **Phase 6**: User Story 4 implementation (T051-T066) - ~1.5 hours
5. **STOP and VALIDATE**: Run build with `--generate-audio`, open page, verify audio plays
6. **Result**: Full MVP - build generates audio AND pages can play it

### Incremental Delivery

1. **Setup + Foundational** → Service module validated (Phase 1-2)
2. **+ User Story 1** → Build generates audio (Phase 3)
3. **+ User Story 4** → Pages play audio (Phase 6) - **FULL USER-FACING MVP**
4. **+ User Story 2** → Local dev without API keys (Phase 4)
5. **+ User Story 3** → Production HTTP provider (Phase 5)
6. **+ Polish** → Documentation complete (Phase 7)

Each increment is independently testable and deployable.

### Parallel Team Strategy

With multiple developers after Phase 2 completes:

- **Developer A**: User Story 1 (T010-T020) - Build pipeline integration
- **Developer B**: User Story 2 (T021-T029) - Mock provider tests
- **Developer C**: User Story 3 (T030-T040) - HTTP provider tests
- **Developer D**: User Story 4 (T051-T066) - Audio player component (starts after US1 generates files)

US4 can build component code in parallel, but integration testing requires US1 completion.

---

## Summary

- **Total Tasks**: 83 (previously 50, added 33 for playback component)
- **Phases**: 7 (Setup, Foundational, 4 User Stories, Polish)
- **MVP Scope**: Phases 1-3 + Phase 6 (36 tasks, ~4 hours) - Build + Playback
- **Parallel Opportunities**: 24 tasks can run in parallel within their phases
- **Service Module Status**: ✅ Already implemented at `web/src/lib/tts-service.ts`
- **Primary Work**: Build pipeline integration (US1), audio player component (US4), and test coverage (US2, US3)

**Next Action**: Start Phase 1 (Setup) tasks T001-T004
