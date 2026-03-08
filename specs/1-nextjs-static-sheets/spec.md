# Feature Specification: Static Next.js site from Google Sheets

**Feature Branch**: `1-nextjs-static-sheets`  
**Created**: 2026-03-07  
**Status**: Draft  
**Input**: User description: "static nextjs with google sheet api"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish content from Sheets (Priority: P1)

A content author edits rows in a Google Sheet (posts tab) and marks rows as "publish". The build pipeline reads the Sheet, generates static pages for each published row, and outputs a deployable static site.

**Why this priority**: Enables non-technical content authors to publish posts without developer intervention; core value for the blog.

**Independent Test**: Update a row in the Sheet to "publish" and run the build pipeline locally; verify a new static page is created with the expected content and metadata.

**Acceptance Scenarios**:

1. **Given** the Sheet contains one row with `publish=true`, **When** the build runs, **Then** a static page for that post exists in the output and is listed in the site index.
2. **Given** the Sheet schema is missing a required column, **When** the build runs, **Then** the build fails with a clear schema error and no partial deploy occurs.

---

### User Story 2 - Local preview for authors (Priority: P2)

Authors want a quick local preview to check formatting and assets before pushing a new site deploy.

**Why this priority**: Reduces publish errors and speeds content validation.

**Independent Test**: Run the preview command; the local preview serves the current build output and shows the new post added in User Story 1.

**Acceptance Scenarios**:

1. **Given** a completed local build, **When** the preview command runs, **Then** the author can navigate to the new post URL locally and verify content.

---

### User Story 3 - Worksheet table pages (Priority: P1)

Every worksheet in the Google Sheet must render as a single table page on the site. The worksheet page lists all rows (topics) as a table (columns inferred from the worksheet header) and links each row to its single-topic page.

**Why this priority**: Provides an author-friendly index for each topic collection and satisfies the requirement that worksheets be viewable as tables on the site.

**Independent Test**: Run the build and open `/worksheets/<worksheet-slug>` locally; confirm the page renders a table with the worksheet's header columns and one row per sheet row, and that row links navigate to the per-row topic page.

**Acceptance Scenarios**:

1. **Given** a worksheet named `vocabulary` with 10 rows, **When** the build runs, **Then** the site includes `/worksheets/vocabulary` displaying a table with 10 rows and the expected columns.
2. **Given** a worksheet has `audio_url` values, **When** the worksheet page renders, **Then** the table includes a column linking to the external audio asset or the local copied asset when `--fetch-assets` is used.

---

### Edge Cases

- A row contains HTML or markdown mix: the build must sanitize/handle according to spec (assumption: content is markdown).  
- Large media links (audio/video) referenced in the sheet: the build should not inline large binaries; it must copy or reference external assets.  
- Rate limiting from Google Sheets API: pipeline must implement retry/backoff.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch content and metadata from a specified Google Sheet tab and treat columns as the canonical schema.
- **FR-002**: System MUST validate the Sheet schema at fetch time and fail the build with a clear error if required columns are missing.
- **FR-003**: System MUST generate pre-rendered static pages for each published row and an index listing pages.
- **FR-004**: System MUST produce a build manifest mapping source rows (row IDs) to generated artifacts (paths and hashes).
- **FR-005**: System MUST provide a local preview mode to serve generated static output for author review.
- **FR-006**: Authentication for accessing the Google Sheet MUST be via a Google service account JSON credential. The pipeline should support two configuration methods:
	- `GOOGLE_SERVICE_ACCOUNT_PATH` pointing to a local file (default: `./credential.json`), or
	- `GOOGLE_SERVICE_ACCOUNT_JSON` containing the JSON credentials as a string in environment (CI-friendly).
	The build must fail with a clear message if credentials are missing or invalid.
- **FR-007**: The pipeline MUST implement exponential backoff and clear logging when Google API rate limits are hit.

### Key Entities *(include if feature involves data)*

- **PostRow**: Represents a row in the Sheet. Key attributes: `row_id`, `title`, `slug`, `body_markdown`, `publish_flag`, `date`, `author`, `tags`, `media_urls`.
- **BuildManifest**: Represents a single pipeline run: `run_id`, `timestamp`, `source_rows[]` (row_id + hash), `generated_files[]` (path + content_hash), `errors[]`.
- **SiteIndex**: Aggregated listing of all published posts with metadata required for rendering index pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Given a single new `publish=true` row, a local build produces the static page in under 2 minutes on a typical developer machine.
- **SC-002**: 100% of rows with `publish=true` appear as pages in the site index after a successful build.
- **SC-003**: The build fails with a non-zero exit code and publishes no site if required Sheet columns are missing or invalid.
- **SC-004**: Local preview serves pages and author can validate content within 30 seconds of starting the preview server.
- **SC-005**: All success criteria are verifiable via repeatable local builds using the same Sheet data.

## Assumptions

- Content in the Sheet is authored in Markdown (or a single chosen format) — the build will convert markdown to HTML during pre-render.
- Media files are referenced by external URLs or stored in a bucket; the pipeline will not attempt to upload large binaries unless explicitly requested in a follow-up feature.
- The project will remain a static site (no runtime server-side rendering in production).

## Non-Goals

- Real-time editing sync (the system is build-time oriented).  
- Inline CMS/editor UI inside the site.  
- Hosting or provisioning of third-party services (CI/CD or TTS) — out of scope for this feature.

## Implementation Notes (for planning only)

- Prefer using Next.js static output (pre-rendered pages) and a build script that reads the Sheet and writes content files for the Next.js pages/route mapper.  
-- The choice of deployment target is unspecified and impacts CI/CD configuration: Firebase Hosting (recommended) — see research.md for details.


---

*End of spec draft.*


## Merged plan from `specs/master/plan.md`

The following content was merged from `specs/master/plan.md` to keep the feature spec aligned with the canonical plan template generated by the repo helper.

````markdown
# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
	ACTION REQUIRED: Replace the content in this section with the technical details
	for the project. The structure here is presented in advisory capacity to guide
	the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
	ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
	for this feature. Delete unused options and expand the chosen structure with
	real paths (e.g., apps/admin, packages/something). The delivered plan must
	not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

````

