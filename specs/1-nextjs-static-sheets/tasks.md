---
description: "Task list for Static Next.js site from Google Sheets (build + worksheet pages)"
---

# Tasks: Static Next.js site from Google Sheets

**Input**: Design docs in `specs/1-nextjs-static-sheets/` (spec.md, plan.md, research.md, data-model.md, contracts/)

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] Create feature branch and commit initial scaffolding in repository (web/, specs/1-nextjs-static-sheets/) — branch: `1-nextjs-static-sheets` (repository root)
- [ ] T002 [P] Add `.env.example` with placeholder keys `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEET_ID`, `FIREBASE_TOKEN` — file: .env.example
- [ ] T003 [P] Verify `web/package.json` contains scripts: `build:sheets`, `build`, `dev`, `start`, `test` and add if missing — file: web/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

Purpose: Core infrastructure that MUST be complete before any user story implementation.

- [ ] T004 Implement Google Sheets auth helper using service account JSON in `web/scripts/sheets-client.js` (reads `GOOGLE_SERVICE_ACCOUNT_JSON`, fetches sheet by `GOOGLE_SHEET_ID`) — file: web/scripts/sheets-client.js
- [ ] T005 Add schema validation module that asserts required columns per worksheet and fails fast — file: web/scripts/schema-validator.js
- [ ] T006 Update `web/scripts/build-from-sheets.js` to call the Sheets client and schema validator, and write `public/data/manifest.json` with deterministic content hashes — file: web/scripts/build-from-sheets.js
- [X] T007 Configure Firebase deploy workflow for CI: add GitHub Action `/.github/workflows/firebase-deploy.yml` that builds and deploys using `FIREBASE_TOKEN` — file: .github/workflows/firebase-deploy.yml

Checkpoint: Foundational tasks complete — builds can fetch, validate, and emit content locally without deploying.

---

## Phase 3: User Story 1 - Publish content from Sheets (Priority: P1)

Goal: Fetch published rows from Sheets, generate per-row JSON posts, and pre-render per-post pages.

Independent Test: Run `npm run build:sheets` and verify `public/content/posts/*.json` files exist for all `publish_flag` rows; open a per-post URL locally and confirm content.

- [ ] T008 [US1] Implement Sheets -> transform -> post JSON flow in `web/scripts/build-from-sheets.js` (filter `publish_flag`, generate slug, write `public/content/posts/<slug>.json`) — file: web/scripts/build-from-sheets.js
- [ ] T009 [P] [US1] Ensure per-post rendering is implemented in `web/pages/posts/[slug].js` and supports rendering `body_markdown` to HTML — file: web/pages/posts/[slug].js
- [X] T010 [US1] Add unit tests for post generation (schema + slugging) in `web/test/postgen.test.js` using Vitest — file: web/test/postgen.test.js
- [X] T011 [US1] Add acceptance test that runs `node web/scripts/build-from-sheets.js` against `specs/1-nextjs-static-sheets/sample_sheet.json` and asserts generated files — file: web/test/build-acceptance.test.js

Checkpoint: User Story 1 should be independently testable via local build and tests.

---

## Phase 4: User Story 3 - Worksheet table pages (Priority: P1)

Goal: Emit a per-worksheet table page listing all rows and linking to per-row pages.

Independent Test: After build, open `/worksheets/<worksheet-slug>` and verify the table shows all rows and columns detected from the worksheet header.

- [ ] T012 [US3] Emit per-worksheet JSON files at `public/data/worksheets/<worksheet-slug>.json` (columns + rows) from the build script — file: web/scripts/build-from-sheets.js
- [ ] T013 [P] [US3] Verify `web/pages/worksheets/[worksheet].js` renders `public/data/worksheets/<worksheet-slug>.json` into an HTML table and links rows to `/posts/<slug>` — file: web/pages/worksheets/[worksheet].js
- [X] T014 [US3] Add Vitest acceptance test that checks generated worksheet JSON contains expected `columns` and `rows` for the sample sheet — file: web/test/worksheet.test.js

Checkpoint: Worksheet pages render correctly and link to post pages.

---

## Phase 5: User Story 2 - Local preview for authors (Priority: P2)

Goal: Provide a quick local preview mode and instructions so authors can verify formatting before deploy.

Independent Test: Run `npm run dev` or `npm run start` after `npm run build` and navigate to a post and worksheet page locally.

- [ ] T015 [US2] Add a `preview`/`start` script and update Quickstart to document `npm run build:sheets`, `npm run build`, `npm run start` — files: web/package.json, specs/1-nextjs-static-sheets/quickstart.md
- [ ] T016 [US2] Add CLI flags `--fetch-assets` and `--auth=service-account|api-key` to `web/scripts/build-from-sheets.js` (respect `--fetch-assets` to optionally download audio into `public/assets/audio/`) — file: web/scripts/build-from-sheets.js
- [X] T017 [US2] Add a small README for authors showing the preview workflow in `specs/1-nextjs-static-sheets/quickstart.md` — file: specs/1-nextjs-static-sheets/quickstart.md

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Add `.env.example` to `web/` and repo root if missing, and document CI secret names in `specs/1-nextjs-static-sheets/quickstart.md` — files: web/.env.example, .env.example, specs/1-nextjs-static-sheets/quickstart.md
- [X] T019 [P] Add schema contract tests under `web/test/contract/` to validate required columns and failing behavior — files: web/test/contract/schema.contract.test.js
- [X] T020 [P] Add linting and formatting configs and a `prettier`/`eslint` step to package scripts — files: web/.eslintrc.js, web/.prettierrc
- [ ] T021 [P] Update `specs/1-nextjs-static-sheets/plan.md` to include any deviations discovered during implementation — file: specs/1-nextjs-static-sheets/plan.md

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: T001 → T002 → T003
- **Foundational (Phase 2)**: T004,T005,T006,T007 (must complete before User Stories)
- **User Stories (Phase 3-5)**: Start after Foundational completes. US1 and US3 are P1 features and may be implemented in parallel (T008-T011 and T012-T014 can run concurrently if staffed). US2 (T015-T017) can follow or run in parallel.

## Parallel Execution Examples

- Run foundational tasks in parallel: T004 & T005 & T006
- After foundation: Run post generation (T008) and worksheet emission (T012) concurrently (both update different `public/` paths)

## Implementation Strategy

- MVP: Implement the build script to read the sample JSON (`specs/1-nextjs-static-sheets/sample_sheet.json`), emit per-row JSON and per-worksheet JSON, and pre-render pages (T008, T012, T009, T013). Validate with the acceptance tests (T011, T014).  
- Incremental: Add Google Sheets fetch and schema validation (T004, T005), add `--fetch-assets` option (T016), then wire CI deploy (T007).  
- Tests: Use Vitest for unit/acceptance tests; add contract tests once schema validation is in place.

## Tasks Summary

- Total tasks: 21
- P1 (highest priority) tasks: T008, T012, T009, T013
- Parallel opportunities: Setup tasks (T001-T003), Foundational tasks (T004-T006), Postgen vs Worksheet emission (T008 vs T012)

All tasks follow the required checklist format and include explicit file paths for implementation.
