# Quickstart: TTS Audio Generation & Playback

**Feature**: 002-tts-audio  
**Created**: 2026-03-08  
**Time to Complete**: ~30 minutes

## Prerequisites

- Node.js 18+ installed
- Project cloned and dependencies installed (`npm install` in `web/`)
- Google Sheets API credentials configured (see main project README)
- `GOOGLE_SHEET_ID` environment variable set

---

## Phase 1: Audio Generation (Build-Time)

### Step 1: Configure TTS Provider

**For Local Development (Mock Provider)**:

```bash
cd web
echo "TTS_PROVIDER=mock" >> .env.local
```

**For Production (HTTP Provider)**:

```bash
cd web
echo "TTS_PROVIDER=http" >> .env.local
echo "TTS_API_URL=https://your-tts-api.com/synthesize" >> .env.local
echo "TTS_API_KEY=your-api-key-here" >> .env.local
echo "DEFAULT_TTS_VOICE=th-TH-Standard-A" >> .env.local
```

### Step 2: Generate Audio Files

Run the build script with audio generation enabled:

```bash
cd web
npm run build:sheets -- --generate-audio
```

**Expected Output**:
```
[build-from-sheets] Processing worksheets...
[tts-service] Generating audio for "animals" → /assets/audio/a3f2b1c9...mp3
[tts-service] Generating audio for "colors" → /assets/audio/b4e3d2c1...mp3
[tts-service] Cache hit for "numbers" → /assets/audio/c5f4e3d2...mp3
✓ Build complete: 17 posts processed, 17 audio files generated (5 cache hits)
```

### Step 3: Verify Audio Files

Check that audio files were created:

```bash
ls web/public/assets/audio/
```

**Expected**:
```
a3f2b1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1.mp3
b4e3d2c1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3.mp3
... (one file per post)
```

### Step 4: Test Cache Behavior

Run build again with identical Sheet data:

```bash
npm run build:sheets -- --generate-audio
```

**Expected Output**:
```
[tts-service] Cache hit for "animals" → /assets/audio/a3f2b1c9...mp3
[tts-service] Cache hit for "colors" → /assets/audio/b4e3d2c1...mp3
... (all cache hits, no new API calls)
✓ Build complete: 17 posts processed, 17 audio files (17 cache hits)
```

**Validation**: Build should be significantly faster (no TTS API calls made).

---

## Phase 2: Audio Playback (Runtime)

### Step 5: Create AudioPlayer Component

Create the React component:

```bash
cd web
mkdir -p src/components
```

**File**: `web/src/components/AudioPlayer.tsx`

```tsx
import { useState } from 'react';

export interface AudioPlayerProps {
  audioPath: string;
  title?: string;
  className?: string;
}

export function AudioPlayer({ audioPath, title, className }: AudioPlayerProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <p className="audio-error" role="alert">
        Audio unavailable for this post.
      </p>
    );
  }

  return (
    <audio
      controls
      preload="metadata"
      className={className}
      onError={() => setError(true)}
      aria-label={title ? `Audio for ${title}` : 'Audio player'}
    >
      <source src={audioPath} type="audio/mpeg" />
      Your browser does not support audio playback.
    </audio>
  );
}
```

### Step 6: Integrate into Page Template

**File**: `web/pages/worksheets/[worksheet].tsx`

Add import at top:

```tsx
import { AudioPlayer } from '@/components/AudioPlayer';
```

Update page component to include audio player:

```tsx
export default function WorksheetPage({ title, audio, content, rows }) {
  return (
    <article className="worksheet-page">
      <h1>{title}</h1>
      
      {/* Audio Player - only render if audio exists */}
      {audio && (
        <div className="audio-section">
          <AudioPlayer audioPath={audio} title={title} className="post-audio-player" />
        </div>
      )}
      
      {/* Rest of content */}
      <div dangerouslySetInnerHTML={{ __html: content }} />
      
      {/* Vocabulary table */}
      <table>{/* ... existing table code ... */}</table>
    </article>
  );
}
```

Update `getStaticProps` to include audio path:

```tsx
export async function getStaticProps({ params }) {
  const worksheet = params.worksheet;
  const post = await loadPostData(worksheet); // Your existing function
  
  return {
    props: {
      title: post.title,
      audio: post.audio || null,  // NEW: audio path from manifest
      content: post.body_markdown,
      rows: post.rows,
    },
  };
}
```

### Step 7: Add Optional Styling

**File**: `web/styles/audio-player.css` (or add to existing stylesheet)

```css
.audio-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.post-audio-player {
  width: 100%;
  max-width: 600px;
  display: block;
  margin: 0 auto;
}

.audio-error {
  color: #d32f2f;
  font-style: italic;
  text-align: center;
  padding: 1rem;
}
```

Import in your layout or page:

```tsx
import '@/styles/audio-player.css';
```

### Step 8: Build and Test

Build the static site:

```bash
cd web
npm run build
```

Start the dev server:

```bash
npm run dev
```

Open browser: `http://localhost:3000/worksheets/animals`

**Validation**:
- ✅ Audio player visible below title
- ✅ Clicking play button loads and plays audio
- ✅ Progress bar updates during playback
- ✅ Pause button stops playback

---

## Phase 3: End-to-End Testing

### Test Scenario 1: New Content with Audio

1. Add new row to Google Sheet (e.g., "fruits" worksheet)
2. Run build with audio generation:
   ```bash
   npm run build:sheets -- --generate-audio
   ```
3. Verify new audio file created
4. Build site: `npm run build`
5. Visit `/worksheets/fruits` → audio player should appear

### Test Scenario 2: Updated Content

1. Modify text in existing Google Sheet row
2. Run build with audio generation:
   ```bash
   npm run build:sheets -- --generate-audio
   ```
3. Verify **new** audio file created (different hash)
4. Verify **old** audio file still exists (not deleted)
5. Build site and verify updated audio plays

### Test Scenario 3: Missing Audio File

1. Manually delete an audio file from `public/assets/audio/`
2. Build site: `npm run build`
3. Visit page for deleted audio → error message should display
4. Page should remain functional (no crash)

### Test Scenario 4: Mock Provider (Local Dev)

1. Ensure `TTS_PROVIDER=mock` in `.env.local`
2. Delete all audio files: `rm -rf web/public/assets/audio/*.mp3`
3. Run build: `npm run build:sheets -- --generate-audio`
4. Verify placeholder files created (small text files with .mp3 extension)
5. Build site and verify player renders (won't play real audio, but UI works)

---

## Troubleshooting

### Issue: "TTS_API_URL is required for http provider"

**Cause**: HTTP provider selected but env vars missing

**Solution**:
```bash
echo "TTS_PROVIDER=mock" >> .env.local  # Use mock for local dev
# OR
echo "TTS_API_URL=..." >> .env.local    # Configure HTTP provider
echo "TTS_API_KEY=..." >> .env.local
```

### Issue: Audio player not rendering on pages

**Checklist**:
1. Verify `post.audio` field exists in manifest
2. Verify audio file exists at path specified
3. Check conditional rendering: `{audio && <AudioPlayer ... />}`
4. Check browser console for import errors

### Issue: "Cannot find module '@/components/AudioPlayer'"

**Solution**: Update `tsconfig.json` paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Or use relative import:

```tsx
import { AudioPlayer } from '../components/AudioPlayer';
```

### Issue: Build is slow with HTTP provider

**Cause**: Generating audio for all posts on every build

**Solution 1**: Use mock provider for local dev:
```bash
TTS_PROVIDER=mock npm run build:sheets -- --generate-audio
```

**Solution 2**: Commit generated audio files to git (temporary):
```bash
git add -f web/public/assets/audio/*.mp3
git commit -m "Cache audio files"
```

**Solution 3**: Skip audio generation when not needed:
```bash
npm run build:sheets  # No --generate-audio flag
```

---

## Quick Reference

### Environment Variables

```bash
# .env.local
TTS_PROVIDER=mock                           # or 'http'
TTS_API_URL=https://api.example.com/tts    # Required for http provider
TTS_API_KEY=your-secret-key                 # Required for http provider
DEFAULT_TTS_VOICE=th-TH-Standard-A          # Optional default voice
```

### Build Commands

```bash
# Generate audio with mock provider (fast, no API keys)
TTS_PROVIDER=mock npm run build:sheets -- --generate-audio

# Generate audio with HTTP provider (real TTS API)
npm run build:sheets -- --generate-audio

# Build without audio generation (skip audio)
npm run build:sheets

# Full build with audio
npm run build:sheets -- --generate-audio && npm run build

# Dev server
npm run dev
```

### File Locations

```
web/
├── src/
│   ├── components/
│   │   └── AudioPlayer.tsx          # Audio player component
│   └── lib/
│       └── tts-service.ts            # TTS service module
├── pages/
│   └── worksheets/
│       └── [worksheet].tsx           # Page template with audio player
├── public/
│   └── assets/
│       └── audio/
│           └── *.mp3                 # Generated audio files
├── scripts/
│   └── build-from-sheets.ts          # Build script (audio integration)
└── .env.local                        # Local config (gitignored)
```

---

## Success Criteria Validation

After completing this quickstart, verify:

- ✅ **SC-001**: Build pipeline completes successfully with audio generation enabled
- ✅ **SC-002**: Subsequent builds with identical data are 50%+ faster (cache hits)
- ✅ **SC-003**: Local development works without TTS API credentials (mock provider)
- ✅ **SC-004**: Audio files are deterministically named (same content → same filename)
- ✅ **SC-005**: Build fails with clear error when HTTP provider misconfigured
- ✅ **SC-006**: No credentials appear in logs or error messages
- ✅ **SC-007**: Service module has unit tests (see `web/test/tts-service.test.ts`)
- ✅ **SC-008**: Blog post pages display audio player component
- ✅ **SC-009**: Audio player provides play/pause controls and progress indicator
- ✅ **SC-010**: Audio player handles errors gracefully (error message displayed)

---

## Next Steps

1. **Write Tests**: Create unit tests for AudioPlayer component (see `contracts/audio-player-contract.md`)
2. **Customize Styling**: Update CSS to match your site design
3. **Configure Production TTS**: Set up real TTS provider (Google Cloud TTS, AWS Polly, etc.)
4. **Monitor Usage**: Add analytics to track audio playback (optional)
5. **Optimize Performance**: Consider lazy-loading audio files for pages below fold

**Ready for Production**: After completing this quickstart and validating all success criteria, the feature is ready to deploy!
