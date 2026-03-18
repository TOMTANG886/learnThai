// web/src/components/AudioPlayer.tsx
// Reusable HTML5 audio player component for Thai blog post pages.
// Principle III: isolated component with clear props interface, no runtime API dependencies.

import { useState } from 'react'

export interface AudioPlayerProps {
  /** URL path to audio file (e.g. "/assets/audio/abc123.mp3") */
  audioPath: string
  /** Post title used for ARIA label (optional) */
  title?: string
  /** CSS class name for custom styling (optional) */
  className?: string
}

/**
 * AudioPlayer renders an HTML5 <audio> element with controls.
 *
 * - Uses preload="metadata" to avoid auto-downloading the full file.
 * - Handles load errors gracefully with a fallback message.
 * - Accessible: aria-label describes the audio content.
 * - No external dependencies — browser-native controls only.
 */
export function AudioPlayer({ audioPath, title, className }: AudioPlayerProps): JSX.Element {
  const [error, setError] = useState(false)

  const ariaLabel = title ? `Audio for ${title}` : 'Audio player'

  if (error) {
    return (
      <p className="audio-error" role="alert">
        Audio unavailable for this post.
      </p>
    )
  }

  return (
    <audio
      controls
      preload="metadata"
      aria-label={ariaLabel}
      className={className}
      onError={() => setError(true)}
    >
      <source src={audioPath} type="audio/mpeg" />
      Your browser does not support audio playback.
    </audio>
  )
}

export default AudioPlayer
