# Contract: AudioPlayer Component Interface

**Feature**: 002-tts-audio  
**Created**: 2026-03-08  
**Component**: `web/src/components/AudioPlayer.tsx`

## Purpose

Define the public interface for the React AudioPlayer component used to render audio playback UI on blog post pages.

---

## Component Signature

```typescript
export function AudioPlayer(props: AudioPlayerProps): JSX.Element
```

---

## Props Interface

### `AudioPlayerProps`

```typescript
export interface AudioPlayerProps {
  audioPath: string;     // Required: URL path to audio file
  title?: string;        // Optional: Post title for ARIA label
  className?: string;    // Optional: CSS class for styling
}
```

**Field Contracts**:

#### `audioPath` (required)

- **Type**: `string`
- **Format**: Absolute URL path (e.g., "/assets/audio/abc123.mp3") or external URL (e.g., "https://cdn.example.com/audio.mp3")
- **Validation**: MUST be non-empty string
- **Usage**: Passed directly to HTML5 `<audio>` element `src` attribute

**Example Values**:
```typescript
"/assets/audio/a3f2b1c9d4e5f6...mp3"  // ✅ Valid: local static file
"https://cdn.example.com/audio.mp3"   // ✅ Valid: external CDN
"/audio/file.mp3"                      // ✅ Valid: other path
""                                     // ❌ Invalid: empty string
undefined                              // ❌ Invalid: must be string
```

#### `title` (optional)

- **Type**: `string | undefined`
- **Purpose**: Used for accessibility (`aria-label` on audio element)
- **Default**: If undefined, generic label used (e.g., "Audio player")
- **Example**: "Thai Animals Vocabulary"

#### `className` (optional)

- **Type**: `string | undefined`
- **Purpose**: CSS class name for custom styling
- **Default**: If undefined, no custom class applied
- **Example**: "post-audio-player" or "audio-player--large"

---

## Component Behavior

### Rendering

**Contract**:
- MUST render an HTML5 `<audio>` element with `controls` attribute
- MUST include `<source>` element with `src={audioPath}` and `type="audio/mpeg"`
- MUST include fallback text for browsers without audio support
- MUST apply `aria-label` with post title (or generic label)
- MAY include loading/error states (not required for v1.0)

**Minimal Implementation**:
```tsx
export function AudioPlayer({ audioPath, title, className }: AudioPlayerProps) {
  return (
    <audio
      controls
      preload="metadata"
      className={className}
      aria-label={title ? `Audio for ${title}` : "Audio player"}
    >
      <source src={audioPath} type="audio/mpeg" />
      Your browser does not support audio playback.
    </audio>
  );
}
```

### Error Handling

**Contract**:
- MUST gracefully handle missing audio files (404 errors)
- SHOULD display user-friendly error message on load failure
- MUST NOT throw errors that break page rendering
- Error state is OPTIONAL for v1.0 (browser default behavior acceptable)

**Enhanced Implementation (optional)**:
```tsx
export function AudioPlayer({ audioPath, title, className }: AudioPlayerProps) {
  const [error, setError] = useState(false);

  if (error) {
    return <p className="audio-error">Audio unavailable for this post.</p>;
  }

  return (
    <audio
      controls
      preload="metadata"
      onError={() => setError(true)}
      className={className}
      aria-label={title ? `Audio for ${title}` : "Audio player"}
    >
      <source src={audioPath} type="audio/mpeg" />
      Your browser does not support audio playback.
    </audio>
  );
}
```

### Accessibility

**Contract (WCAG 2.1 AA compliance)**:
- MUST include `aria-label` attribute describing the audio content
- MUST use native HTML5 `controls` attribute (ensures keyboard navigation)
- SHOULD support keyboard controls (play/pause with Space, seek with Arrow keys) — provided by browser
- MUST NOT interfere with screen reader functionality

**Required Attributes**:
```tsx
<audio
  controls                    // ✅ Provides keyboard navigation
  aria-label={labelText}      // ✅ Describes content for screen readers
  preload="metadata"          // ✅ Loads duration/info without auto-play
>
```

---

## State Management

### Component State

**Contract**:
- Component MAY use local state for error handling (`useState`)
- Component MUST NOT require global state (Redux, Zustand, etc.)
- Component MUST be self-contained (no dependencies on parent state)

### Lifecycle

**Contract**:
- Component MUST mount without side effects (no auto-play)
- Component MUST clean up event listeners on unmount (if custom listeners added)
- Component SHOULD NOT block page rendering during audio load

---

## Styling Contract

### Default Styles

**Contract**:
- Component MUST be functional with no custom CSS (browser default audio controls)
- Component MAY accept `className` prop for custom styling
- Component MUST NOT include inline styles (except minimal layout if needed)

### CSS Selectors

**Available for Styling**:
```css
/* Target the audio element */
.my-custom-class { /* audio element styles */ }

/* Target error message (if implemented) */
.audio-error { /* error message styles */ }
```

**Example Usage**:
```tsx
<AudioPlayer 
  audioPath="/assets/audio/abc123.mp3"
  className="post-audio-player"
/>
```

```css
/* web/styles/audio-player.css */
.post-audio-player {
  width: 100%;
  margin: 1rem 0;
  border-radius: 8px;
}
```

---

## Integration Contract

### Usage in Pages

**Contract**:
- Component MUST be importable from `web/src/components/AudioPlayer`
- Component MUST work with Next.js static site generation (SSG)
- Component MUST NOT require runtime API calls

**Example Page Integration**:
```tsx
// web/pages/worksheets/[worksheet].tsx
import { AudioPlayer } from '@/components/AudioPlayer';

export async function getStaticProps({ params }) {
  const post = await loadPostData(params.worksheet);
  return {
    props: {
      title: post.title,
      audio: post.audio || null,
      content: post.body_markdown,
    },
  };
}

export default function WorksheetPage({ title, audio, content }) {
  return (
    <article>
      <h1>{title}</h1>
      {audio && <AudioPlayer audioPath={audio} title={title} />}
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  );
}
```

### Conditional Rendering

**Contract**:
- Pages SHOULD check if `audio` path exists before rendering component
- Component behavior when `audioPath=""` is UNDEFINED (validation expected at call site)
- Recommended pattern: `{audio && <AudioPlayer audioPath={audio} />}`

---

## Browser Compatibility

**Contract**:
- Component MUST work in all modern browsers (Chrome, Firefox, Safari, Edge)
- Component MUST support mobile browsers (iOS Safari, Chrome Android)
- Component SHOULD gracefully degrade in browsers without MP3 support (fallback text)

**Minimum Browser Versions**:
- Chrome 20+
- Firefox 21+
- Safari 6+
- Edge (all versions)
- iOS Safari 4+
- Android Browser 4.1+

---

## Performance Contract

**Loading Behavior**:
- MUST use `preload="metadata"` (loads duration/info without full file)
- MUST NOT use `autoplay` (user-initiated playback only)
- SHOULD NOT block page render (audio loads asynchronously)

**Bundle Size**:
- Component MUST NOT add external dependencies
- Component size SHOULD be < 1KB after minification
- No third-party audio player libraries allowed (Principle V: Simplicity)

---

## Testing Contract

### Unit Tests MUST Cover

- Component renders with required `audioPath` prop
- Component renders with optional `title` and `className` props
- Component includes `<audio>` element with `controls` attribute
- Component includes `<source>` element with correct `src` and `type`
- Component includes `aria-label` with post title

### Tests SHOULD Cover (optional)

- Error state displays user-friendly message
- `onError` handler sets error state correctly

### Tests MUST NOT Require

- Real audio file playback
- Network requests
- Browser audio APIs (test DOM output only)

**Example Test**:
```tsx
// web/test/components/AudioPlayer.test.tsx
import { render } from '@testing-library/react';
import { AudioPlayer } from '@/components/AudioPlayer';

test('renders audio element with controls', () => {
  const { container } = render(
    <AudioPlayer audioPath="/audio/test.mp3" title="Test Audio" />
  );
  
  const audio = container.querySelector('audio');
  expect(audio).toHaveAttribute('controls');
  expect(audio).toHaveAttribute('aria-label', 'Audio for Test Audio');
  
  const source = container.querySelector('source');
  expect(source).toHaveAttribute('src', '/audio/test.mp3');
  expect(source).toHaveAttribute('type', 'audio/mpeg');
});
```

---

## Versioning

**Current Version**: 1.0  
**Breaking Changes**: Changes to props interface require major version bump

**Backward Compatibility**:
- Adding optional props: minor version bump
- Adding error handling UI: minor version bump
- Changing required props or removing props: major version bump

---

## Future Enhancements (Out of Scope for v1.0)

Potential additions for future versions (require spec updates):

```typescript
interface AudioPlayerProps {
  // v1.0 props
  audioPath: string;
  title?: string;
  className?: string;
  
  // Potential v2.0 additions
  showDownload?: boolean;     // Download button
  playbackRate?: number;      // Speed control (1x, 1.5x, 2x)
  autoPlay?: boolean;         // Auto-start (violates Principle V without user need)
  onPlay?: () => void;        // Analytics callback
  onComplete?: () => void;    // Track completion
}
```

---

## Summary

**Exports**: 1 component (`AudioPlayer`), 1 interface (`AudioPlayerProps`)  
**Required Props**: 1 (`audioPath`)  
**Optional Props**: 2 (`title`, `className`)  
**DOM Output**: HTML5 `<audio>` element with `controls`  
**Dependencies**: None (React only)  
**Bundle Impact**: < 1KB  
**Accessibility**: WCAG 2.1 AA compliant (native controls + ARIA labels)
