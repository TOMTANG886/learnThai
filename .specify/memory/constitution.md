<!--
SYNC IMPACT REPORT
==================
Version change:    1.0.0 → 1.1.0
Modified principles:
  None
Added sections:
  - Specs Directory Hygiene (enforces plan.md, spec.md, tasks.md per feature)
Removed sections:
  None
Templates requiring review:
  ✅ .specify/templates/plan-template.md (Constitution Check present)
  ✅ .specify/templates/spec-template.md (Key Entities guidance aligned)
  ✅ .specify/templates/tasks-template.md (Foundational phase examples aligned)
Templates updated:
  ⚠ .specify/templates/spec-template.md (ensure it documents required filenames)
Deferred TODOs:
  None — all fields resolved.
-->

# LearnThai Audio Blog Constitution

## Core Principles

### I. Static-First Content Delivery

The blog MUST be built and served exclusively as pre-rendered static files
(HTML, CSS, JS, audio). All data fetching MUST happen at build time; no
runtime server-side rendering or dynamic content endpoints are permitted in
production.

**Rationale**: Static delivery guarantees predictable performance, minimal
hosting cost, and zero server-runtime attack surface — critical for a
content-focused blog with no authentication requirements.

- Build output MUST be deployable to any static host (e.g., GitHub Pages,
  Netlify, Vercel static, AWS S3 + CloudFront).
- No serverless functions or API routes may be introduced unless strictly
  required for a build-time integration and explicitly justified in the
  feature plan.
- Client-side JS MUST be kept minimal; interactivity added only when a
  user story explicitly demands it.

### II. Google Sheets as Single Source of Truth

All blog content and metadata MUST originate from Google Sheets. No
secondary database, CMS, or local content files may duplicate or shadow
Sheet data.

**Rationale**: Google Sheets provides a non-technical authoring interface
that the content team can manage without developer involvement. Treating it
as the canonical schema keeps the system simple and the data in one place.

- The column structure of each Sheet tab IS the data contract. Column
  additions or renames MUST be treated as schema changes and versioned
  accordingly.
- Read access to the Sheet MUST use a service account or API key stored in
  environment variables — never hardcoded in source.
- Build pipelines MUST fail fast with a clear error if the Sheet is
  unreachable or returns an unexpected schema.
- Sheets MUST NOT be written to by the application; they are read-only
  inputs to the build pipeline.

### III. Isolated Service Modules

Translation and audio generation MUST be implemented as isolated, independently
testable service modules with well-defined input/output contracts. No
direct cross-service calls are permitted; each service is invoked only
through its public interface.

**Rationale**: Decoupling services allows swapping providers (e.g., switching
from Google Translate to DeepL, or from a TTS provider to another) without
touching unrelated code. It also enables unit-testing each service in
isolation.

- Translation service: input = raw text string + source locale + target
  locale; output = translated text string.
- Audio generation service: input = text string + voice/language config;
  output = audio file path or binary blob.
- Each service module MUST expose a clear interface and MUST be testable
  without a live external API (e.g., via mock/stub).
- Service-level errors MUST be caught and surfaced as build errors with
  actionable messages, not silent failures.

### IV. Idempotent Content Pipeline

The full content pipeline — Google Sheets → Translate → Audio → Static
Build → Deploy — MUST be idempotent: running the pipeline multiple times
with the same Sheet data MUST produce the same output without duplication
or corruption.

**Rationale**: Build pipelines fail. Idempotency ensures safe retries and
incremental re-runs without manual cleanup.

- Each pipeline stage MUST be independently re-runnable. A failed audio
  generation step MUST NOT require re-fetching Sheet data from scratch.
- Generated artifacts (translated text, audio files) SHOULD be cached by
  a content hash derived from the source data, avoiding redundant API calls.
- Pipeline stages MUST be ordered: Fetch → Translate → Audio → Build.
  Skipping or reordering stages is not permitted without explicit feature
  justification.
- A pipeline run MUST produce a build manifest recording which posts were
  processed, translated, and had audio generated, for auditability.

### V. Simplicity Over Premature Abstraction

The default answer to "should we add X?" is **no** unless a concrete user
scenario in an approved spec demands it. Complexity MUST be justified with
a specific user need.

**Rationale**: This is a content blog, not a platform. YAGNI keeps the
codebase approachable for solo or small-team maintenance.

- Prefer flat data structures over nested hierarchies.
- Prefer a single pipeline script over a plugin architecture unless the
  number of content types exceeds three.
- Every introduced abstraction (base class, shared utility, framework
  integration) MUST reference the user story that necessitated it.
- Performance optimizations are deferred until a measurable bottleneck
  is identified.

## External Service Contracts

Rules governing the integration with all third-party APIs used by this
project.

- **Google Sheets API**: MUST use Sheets API v4 or later. Credentials
  MUST be stored as environment variables (`GOOGLE_SHEETS_API_KEY` or
  `GOOGLE_SERVICE_ACCOUNT_JSON`). Rate limits MUST be respected; implement
  exponential backoff on 429 responses.
- **Translation API**: The provider is not prescribed at constitution level;
  any translation service is acceptable provided it satisfies the service
  interface defined in Principle III. API keys MUST be stored as environment
  variables.
- **Audio Generation (TTS) API**: Provider is not prescribed; any TTS service
  is acceptable provided it satisfies the service interface defined in
  Principle III. Generated audio files MUST be in a web-compatible format
  (MP3 or OGG). API keys MUST be stored as environment variables.
- All API credentials MUST be excluded from version control via `.gitignore`
  and MUST be documented in `.env.example` with placeholder values.
- No API key or secret MUST ever appear in build logs, error messages, or
  generated static files.

## Build & Deployment Standards

Standards that govern how the blog is built, validated, and shipped.

- The build MUST be reproducible: given identical Sheet data and environment
  variables, two consecutive builds MUST produce byte-identical static
  output (excluding timestamps embedded by tools).
- The build MUST complete without errors before any deployment. A build with
  unresolved translation failures or missing audio files MUST NOT be deployed.
- Environment configuration MUST follow a tiered model:
  - `.env.example` — committed to source control; contains only keys with
    placeholder values.
  - `.env.local` — developer local overrides; MUST be gitignored.
  - CI/CD secrets — injected at pipeline runtime.
- Deployment targets MUST be limited to static hosting. No container
  orchestration, databases, or persistent compute are permitted.
- The `README.md` MUST document the full local development setup in five
  steps or fewer.

## Governance

This constitution supersedes all other project practices and guidelines.
Any practice that contradicts a principle stated here is invalid unless
an amendment has been ratified.

**Amendment procedure**:

1. Open a pull request with the proposed change to
   `.specify/memory/constitution.md`.
2. State the version bump (MAJOR / MINOR / PATCH) and rationale in the
   PR description.
3. Update `LAST_AMENDED_DATE` to the merge date; increment
   `CONSTITUTION_VERSION` accordingly.
4. Run the `speckit.constitution` agent after merge to propagate changes
   to all dependent templates.

**Versioning policy**:

- MAJOR: A principle is removed, fundamentally redefined, or a new
  non-negotiable constraint is added that requires existing work to change.
- MINOR: A new principle or section is added, or existing guidance is
  materially expanded.
- PATCH: Clarifications, wording improvements, or typo fixes with no
  semantic change.

**Compliance review**: Every feature plan MUST include a Constitution Check
section (see `plan-template.md`). A gate violation found during planning
MUST be resolved or formally justified before implementation begins. All
PRs MUST verify compliance with the active principles at review time.

## Specs Directory Hygiene

All feature specification directories under `/specs` MUST follow a strict,
minimal layout to keep the repository maintainable and discoverable.

- Each feature folder MUST contain exactly these files: `plan.md`, `spec.md`,
  and `tasks.md`. These files are the canonical artifacts for planning,
  specification, and task tracking respectively.
- Any other supporting files (sample data, scripts, large assets) MUST be
  placed under a subfolder named `assets/` inside the feature folder or in
  a central location outside `/specs` and referenced from `plan.md`.
- Pull requests that add or modify files under `/specs` which do not conform
  to this layout MUST include a justification in the PR description and are
  subject to explicit approval by a project maintainer.
- CI or pre-merge checks SHOULD validate this rule and fail the PR when
  violations are detected.

**Version**: 1.1.0 | **Ratified**: 2026-03-07 | **Last Amended**: 2026-03-08
