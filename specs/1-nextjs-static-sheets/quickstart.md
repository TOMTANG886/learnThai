# Author Quickstart: LearnThai Blog

This guide covers everything you need to preview content locally and understand how CI deploys to production.

---

## Prerequisites

- **Node.js 18+** — check with `node --version`
- A Google Sheet set up with the required columns (see [Schema](#schema) below)
- A Google Cloud service account with Sheets read access (for live fetch), **or** use the sample JSON for local testing

---

## Local Preview (No Google Account Needed)

The fastest way to preview content locally uses the sample JSON file — no credentials required.

### 1. Install dependencies

```bash
cd web
npm install
```

### 2. Run the build against the sample data

```bash
npm run build:sheets -- --sample=../specs/1-nextjs-static-sheets/sample_sheet.json
```

This generates:
- `web/public/content/posts/<slug>.json` — one file per published post
- `web/public/data/worksheets/<worksheet-slug>.json` — table data for each worksheet
- `web/public/data/manifest.json` — build manifest with content hashes

### 3. Build the Next.js site

```bash
npm run build
```

### 4. Start the preview server

```bash
npm run start
# or for hot-reload during development:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Live Fetch from Google Sheets

### Environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `GOOGLE_SHEET_ID` | The ID from your Sheet URL: `…/d/<ID>/edit` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON of the service account key (one line, escaped) |
| `FIREBASE_TOKEN` | CI deploy token (see CI Setup below) |

### Run a live build

```bash
npm run build:sheets
npm run build
npm run start
```

---

## Schema

Every worksheet used as a **posts** source must contain these columns (case-insensitive):

| Column | Required | Description |
|---|---|---|
| `title` | ✓ | Post title |
| `slug` | ✓ | URL-friendly identifier (e.g. `hello-world`) |
| `body_markdown` | ✓ | Post body in Markdown |
| `publish_flag` | ✓ | Set to `true` to publish; anything else keeps the post as a draft |
| `date` | — | Publication date (`YYYY-MM-DD`) |
| `author` | — | Author name |
| `tags` | — | Comma-separated tags (e.g. `greeting,basic`) |
| `audio_url` | — | URL to an audio file for the post |

The build will **fail fast** with a clear error if any required column is missing (FR-002).

---

## Running Tests

```bash
cd web
npm test
```

Tests use [Vitest](https://vitest.dev/) and cover:
- Schema contract validation (`test/contract/schema.contract.test.js`)
- Post generation and slug logic (`test/postgen.test.js`)
- End-to-end build acceptance (`test/build-acceptance.test.js`)
- Worksheet JSON structure (`test/worksheet.test.js`)

---

## CI Setup (GitHub Actions)

The workflow at `.github/workflows/firebase-deploy.yml` runs on every push to `main`.

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** in your repository and add:

| Secret | How to get it |
|---|---|
| `GOOGLE_SHEET_ID` | From your Google Sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Download the service account key JSON from Google Cloud Console; paste the entire JSON as a single-line string |
| `FIREBASE_TOKEN` | Run `npx firebase-tools login:ci` locally and copy the token |

### Workflow steps

1. Checkout repository
2. Set up Node.js 18 with npm cache
3. `npm ci` — install dependencies
4. `npm run build` — fetch Sheet data, validate schema, emit JSON, build Next.js
5. Deploy to Firebase Hosting using `FIREBASE_TOKEN`

---

## Audio Generation (Feature 002-tts-audio)

To generate Thai text-to-speech audio files during the build process, add the `--generate-audio` flag:

```bash
npm run build:sheets -- --generate-audio
```

This will:
1. Generate audio files from the `body_markdown` text of each post
2. Store files in `web/public/assets/audio/` with hash-based filenames
3. Add audio paths to the manifest for playback on blog pages

**Configuration**: See [web/README.md](../../web/README.md#audio-generation) for full documentation on:
- TTS provider options (mock vs HTTP)
- Environment variable configuration
- Caching behavior and performance optimization

**Quick Setup**:

```bash
# Local development (no credentials needed)
echo "TTS_PROVIDER=mock" >> web/.env.local

# Production (requires TTS API)
echo "TTS_PROVIDER=http" >> web/.env.local
echo "TTS_API_URL=https://your-tts-api.com/synthesize" >> web/.env.local
echo "TTS_API_KEY=your-api-key" >> web/.env.local
```

For detailed instructions, see [specs/002-tts-audio/quickstart.md](../002-tts-audio/quickstart.md).

---

## Downloading Audio Assets

To download audio files referenced in `audio_url` into `public/assets/audio/` during the build:

```bash
npm run build:sheets -- --fetch-assets
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `SCHEMA_VALIDATION_FAILED` | Add the missing column(s) to your Google Sheet |
| `GOOGLE_SHEET_ID is required` | Set the env variable in `.env.local` or export it in your shell |
| Build passes but pages are blank | Check that `publish_flag` is exactly `true` (not `TRUE` or `1`) |
| Firebase deploy fails | Verify `FIREBASE_TOKEN` is not expired — re-run `npx firebase-tools login:ci` |
