# learnThai

Monorepo for Thai learning content generation and web publishing.

**Live Demo**: [learnthai-db44a.web.app](https://learnthai-db44a.web.app)

## Repository Structure

- `web/` — Next.js web app (static pages, tests, sheet build pipeline)
- `soundsGen.py` — Python helper script for audio-related workflows
- `specs/` — feature specs, plans, contracts, and checklists

## Start Here

For full setup and run instructions, go to:

- [web/README.md](web/README.md)

## Typical Workflow

1. Set environment variables in `web/.env.local`
2. Build worksheet/content data from Google Sheets
3. (Optional) Generate TTS audio files
4. Run the web app or build static output

See command details in [web/README.md](web/README.md).

## Git Notes

- Keep secrets out of Git (`.env*`, `credential.json` are ignored)
- Commit source code, specs, and reproducible content data
