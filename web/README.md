# Thai Learning Blog - Web Application

Next.js-based static site generator for Thai language learning content with Google Sheets integration and TTS audio generation.

## Features

- 📊 **Google Sheets Integration**: Fetch content from Google Sheets as CMS
- 🎵 **TTS Audio Generation**: Automated Thai text-to-speech during build
- 📄 **Static Site Generation**: Pre-rendered pages for optimal performance
- 🔊 **Audio Playback**: Built-in audio player component for generated audio
- 🧪 **Type-Safe Testing**: Comprehensive test coverage with Vitest

## Quick Start

### Prerequisites

- Node.js 18+ (for native `fetch` API support)
- Google Sheets API credentials
- (Optional) TTS API credentials for production audio generation

### Installation

```bash
cd web
npm install
```

### Configuration

Create `.env.local` file:

```bash
# Required: Google Sheets Integration
GOOGLE_SHEET_ID=your-sheet-id-here

# Optional: TTS Audio Generation
TTS_PROVIDER=mock                           # Options: mock, http
TTS_API_URL=https://your-tts-api.com/tts   # Required if TTS_PROVIDER=http
TTS_API_KEY=your-api-key-here               # Required if TTS_PROVIDER=http
DEFAULT_TTS_VOICE=th-TH-Standard-A          # Optional voice setting
```

### Development

```bash
# Start dev server
npm run dev

# Build site from Google Sheets
npm run build:sheets

# Build site with audio generation
npm run build:sheets -- --generate-audio

# Full production build
npm run build:sheets -- --generate-audio && npm run build

# Run tests
npm test
```

---

## Audio Generation

### Overview

The TTS audio generation service creates audio files from Thai text during the build process. Audio files are cached by content hash to avoid redundant generation.

### TTS Provider Options

#### 1. Mock Provider (Development)

**Use Case**: Local development without TTS API credentials

**Configuration**:
```bash
TTS_PROVIDER=mock
```

**Behavior**:
- Creates placeholder `.mp3` files (small text files)
- No external API calls
- Instant generation
- Deterministic hash-based filenames
- Enables full workflow testing without credentials

**When to Use**:
- Local development and testing
- CI/CD pipelines without API access
- Prototyping and UI development

#### 2. HTTP Provider (Production)

**Use Case**: Real Thai speech synthesis via external TTS API

**Configuration**:
```bash
TTS_PROVIDER=http
TTS_API_URL=https://texttospeech.googleapis.com/v1/text:synthesize
TTS_API_KEY=your-api-key-here
DEFAULT_TTS_VOICE=th-TH-Standard-A
```

**Supported APIs**:
- Google Cloud Text-to-Speech
- AWS Polly
- Azure Speech Services
- Any REST API returning audio binary data

**Behavior**:
- Sends POST request with text, voice, and language parameters
- Receives binary audio data (MP3 format)
- Writes to `public/assets/audio/{hash}.mp3`
- Includes Authorization header with API key
- Fails fast with actionable errors if misconfigured

**Requirements**:
- Valid `TTS_API_URL` environment variable
- Valid `TTS_API_KEY` environment variable
- API must accept JSON payload: `{ text, voice, lang, format }`
- API must return audio binary data in response body

#### 3. Automatic Fallback

**Behavior**: If HTTP provider is selected but not fully configured, the system automatically falls back to Local Provider mode.

**Triggers Fallback**:
- `TTS_PROVIDER` is not set
- `TTS_PROVIDER` is set to something other than `http`
- `TTS_PROVIDER=http` but `TTS_API_URL` or `TTS_API_KEY` is missing

**Example**:
```bash
# This will use mock provider automatically
npm run build:sheets -- --generate-audio
# Output: [tts-service] Provider: mock (HTTP mode not enabled)
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TTS_PROVIDER` | No | `mock` | Provider mode: `mock` or `http` |
| `TTS_API_URL` | Yes (if http) | - | TTS API endpoint URL |
| `TTS_API_KEY` | Yes (if http) | - | API authentication key |
| `DEFAULT_TTS_VOICE` | No | `th-TH-Standard-A` | Default voice identifier |

### Usage Examples

#### Local Development (Mock Provider)

```bash
# Use mock provider (no credentials needed)
TTS_PROVIDER=mock npm run build:sheets -- --generate-audio

# Or set in .env.local
echo "TTS_PROVIDER=mock" >> .env.local
npm run build:sheets -- --generate-audio
```

#### Production Build (HTTP Provider)

```bash
# Configure .env.local
cat >> .env.local << EOF
TTS_PROVIDER=http
TTS_API_URL=https://texttospeech.googleapis.com/v1/text:synthesize
TTS_API_KEY=your-actual-api-key
DEFAULT_TTS_VOICE=th-TH-Standard-A
EOF

# Generate audio with real TTS
npm run build:sheets -- --generate-audio
```

#### Skip Audio Generation

```bash
# Build without audio generation
npm run build:sheets
```

### Caching Behavior

Audio files are cached by **content hash** (SHA-256):

1. **First Build**: Text is hashed, TTS API called, audio saved as `{hash}.mp3`
2. **Subsequent Builds**: If hash exists, file is reused (no API call)
3. **Content Change**: New hash generated, new API call made, new file created

**Cache Hit Example**:
```bash
# First run
npm run build:sheets -- --generate-audio
# Output: [tts-service] Generating audio for "animals" → a3f2b1c9...mp3

# Second run (same content)
npm run build:sheets -- --generate-audio
# Output: [tts-service] Cache hit for "animals" → a3f2b1c9...mp3 (no API call)
```

**Benefits**:
- Reduces build time (50%+ faster on cache hits)
- Saves API quota/costs
- Deterministic builds (same input → same output)

### File Structure

```
web/
├── public/
│   └── assets/
│       └── audio/
│           ├── a3f2b1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1.mp3
│           ├── b4e3d2c1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3.mp3
│           └── ...  (one file per unique text+config combination)
├── src/
│   ├── components/
│   │   └── AudioPlayer.tsx       # React audio player component
│   └── lib/
│       └── tts-service.ts         # TTS service module (core logic)
└── scripts/
    └── build-from-sheets.ts       # Build script (integrates audio generation)
```

### Audio Player Component

The `AudioPlayer` component renders an HTML5 audio player for blog post pages.

**Usage**:

```tsx
import { AudioPlayer } from '@/components/AudioPlayer';

export default function PostPage({ title, audio }) {
  return (
    <article>
      <h1>{title}</h1>
      
      {/* Render audio player if audio path exists */}
      {audio && (
        <AudioPlayer 
          audioPath={audio} 
          title={title} 
          className="my-custom-class"
        />
      )}
      
      {/* Rest of content */}
    </article>
  );
}
```

**Props**:
- `audioPath` (required): URL path to audio file (e.g., `/assets/audio/abc123...mp3`)
- `title` (optional): Post title for aria-label accessibility
- `className` (optional): CSS class for custom styling

**Features**:
- HTML5 native controls (play, pause, progress bar, volume)
- Graceful error handling (displays error message if audio fails to load)
- Accessibility support (ARIA labels, keyboard navigation)
- Responsive design (works on mobile and desktop)

**Styling**:

Add custom styles in your CSS:

```css
/* Recommended base styles */
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

Import the styles:

```tsx
import '@/styles/audio-player.css';
```

---

## Error Handling

### TTS Provider Errors

#### Missing HTTP Configuration

**Error**:
```
ERROR: TTS_PROVIDER is set to 'http' but TTS_API_URL is not configured.
Please set TTS_API_URL in your environment or use TTS_PROVIDER=mock for local development.
```

**Solution**:
```bash
# Option 1: Use mock provider
echo "TTS_PROVIDER=mock" >> .env.local

# Option 2: Add HTTP credentials
echo "TTS_API_URL=https://your-api.com/tts" >> .env.local
echo "TTS_API_KEY=your-key" >> .env.local
```

#### API Request Failed

**Error**:
```
TTS API request failed: 401 Unauthorized
```

**Common Causes**:
- Invalid API key
- API key expired
- Incorrect API URL
- API rate limit exceeded

**Solution**:
1. Verify API key is correct
2. Check API provider dashboard for status
3. Test with `curl` directly:
   ```bash
   curl -X POST "$TTS_API_URL" \
     -H "Authorization: Bearer $TTS_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"text":"สวัสดี","voice":"th-TH-Standard-A","lang":"th-TH"}'
   ```

#### Network Timeout

**Error**:
```
TTS API request failed: Network timeout
```

**Solution**:
- Check internet connection
- Verify API endpoint is accessible
- Try again (temporary network issue)

### Audio Player Errors

#### Audio File Not Found

**Symptom**: Player shows "Audio unavailable for this post"

**Causes**:
- Audio file was deleted from `public/assets/audio/`
- Build ran without `--generate-audio` flag
- Incorrect audio path in manifest

**Solution**:
```bash
# Regenerate missing audio files
npm run build:sheets -- --generate-audio
npm run build
```

#### Browser Compatibility

**Symptom**: "Your browser does not support audio playback"

**Solution**: Use a modern browser (Chrome, Firefox, Safari, Edge) with HTML5 audio support.

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# TTS service tests
npm test -- tts-service.test.ts

# Audio player component tests
npm test -- AudioPlayer.test.tsx

# Contract tests
npm test -- contract/tts-contract.test.ts

# Build acceptance tests
npm test -- build-acceptance.test.ts
```

### Test Coverage

```bash
npm test -- --coverage
```

---

## Performance Optimization

### Reduce Build Time

1. **Use Mock Provider for Local Dev**:
   ```bash
   TTS_PROVIDER=mock npm run build:sheets -- --generate-audio
   ```

2. **Commit Audio Files** (if desired):
   ```bash
   git add -f web/public/assets/audio/*.mp3
   git commit -m "Cache audio files for faster builds"
   ```

3. **Skip Audio Generation When Not Needed**:
   ```bash
   npm run build:sheets  # No --generate-audio flag
   ```

### Audio File Size

Current implementation:
- **Format**: MP3
- **Typical Size**: 50-500 KB per post (depends on text length)
- **Caching**: Browser caches audio files (reduces repeat visitor bandwidth)

---

## Troubleshooting

### Audio Player Not Rendering

**Checklist**:
1. ✅ Verify `audio` field exists in post data
2. ✅ Check conditional rendering: `{audio && <AudioPlayer ... />}`
3. ✅ Verify component import path is correct
4. ✅ Check browser console for errors

### Import Module Error

**Error**: `Cannot find module '@/components/AudioPlayer'`

**Solution**: Update `tsconfig.json`:

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

### Slow Build with HTTP Provider

**Symptom**: Build takes 5+ minutes

**Causes**:
- Generating audio for many posts
- No cached files (first run)
- Slow TTS API response

**Solutions**:
1. Use mock provider for local dev
2. Commit generated audio files to git
3. Run builds incrementally (only generate when content changes)

---

## Security

### API Key Protection

**✅ DO**:
- Store API keys in `.env.local` (gitignored)
- Use environment variables in production deployments
- Rotate keys regularly

**❌ DON'T**:
- Commit `.env.local` to git
- Hardcode API keys in source code
- Include keys in error messages or logs

### Credential Logging

The TTS service **never logs or exposes**:
- API keys
- Authorization headers
- Full API URLs with credentials

Error messages include:
- ✅ HTTP status codes
- ✅ Error types (network, auth, etc.)
- ✅ Actionable troubleshooting steps

---

## Architecture

### TTS Service Module

**Location**: `src/lib/tts-service.ts`

**Exports**:
- `generateAudioForPost(text, slug, opts)`: Main audio generation function
- `hashTextForAudio(text, opts)`: Content hash generation
- `TtsOptions`: TypeScript interface for configuration

**Design Principles**:
- **Isolated**: No dependencies on build scripts or page components
- **Idempotent**: Same input always produces same output
- **Cacheable**: Hash-based filenames enable deterministic caching
- **Testable**: Can be tested without live API (mock provider)

### Build Pipeline Integration

**Location**: `scripts/build-from-sheets.ts`

**Flow**:
1. Fetch content from Google Sheets
2. For each post:
   - Translate content (existing)
   - **Generate audio** (if `--generate-audio` flag present)
   - Write JSON file
3. Update manifest with audio paths and hashes
4. Build static site

---

## Contributing

### Adding New TTS Providers

To add support for a new TTS provider (e.g., AWS Polly, Azure Speech):

1. Update `TtsOptions` interface in `src/lib/tts-service.ts`
2. Add provider implementation to `generateAudioForPost` function
3. Add provider-specific env vars to `.env.example`
4. Update tests in `test/tts-service.test.ts`
5. Document in this README

### Updating Audio Player

To add features to the audio player (e.g., speed control, download button):

1. Update `AudioPlayerProps` interface in `src/components/AudioPlayer.tsx`
2. Implement feature in component
3. Add tests in `test/components/AudioPlayer.test.tsx`
4. Update styling in `styles/audio-player.css`
5. Document in this README

---

## License

[Your License Here]

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review [specs/002-tts-audio/](../specs/002-tts-audio/) documentation
- Check test files for usage examples

---

**Last Updated**: 2026-03-08  
**Feature Version**: 002-tts-audio
