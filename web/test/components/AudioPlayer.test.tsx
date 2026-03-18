// web/test/components/AudioPlayer.test.tsx
// Unit tests for the AudioPlayer React component.
// Tests DOM output only — no real audio playback, no network requests.
// Environment: jsdom (set via vitest.config.js environmentMatchGlobs).

/// <reference types="vitest/globals" />
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AudioPlayer } from '../../src/components/AudioPlayer'

// ─── Rendering contract ──────────────────────────────────────────────────────

describe('AudioPlayer — rendering', () => {
  test('renders an <audio> element', () => {
    const { container } = render(<AudioPlayer audioPath="/assets/audio/abc123.mp3" />)
    const audio = container.querySelector('audio')
    expect(audio).toBeInTheDocument()
  })

  test('<audio> has controls attribute', () => {
    const { container } = render(<AudioPlayer audioPath="/assets/audio/abc123.mp3" />)
    const audio = container.querySelector('audio')
    expect(audio).toHaveAttribute('controls')
  })

  test('<audio> has preload="metadata" attribute', () => {
    const { container } = render(<AudioPlayer audioPath="/assets/audio/abc123.mp3" />)
    const audio = container.querySelector('audio')
    expect(audio).toHaveAttribute('preload', 'metadata')
  })

  test('<source> element has correct src from audioPath prop', () => {
    const { container } = render(<AudioPlayer audioPath="/assets/audio/abc123.mp3" />)
    const source = container.querySelector('source')
    expect(source).toHaveAttribute('src', '/assets/audio/abc123.mp3')
  })

  test('<source> element has type="audio/mpeg"', () => {
    const { container } = render(<AudioPlayer audioPath="/assets/audio/abc123.mp3" />)
    const source = container.querySelector('source')
    expect(source).toHaveAttribute('type', 'audio/mpeg')
  })

  test('includes fallback text for browsers without audio support', () => {
    const { container } = render(<AudioPlayer audioPath="/assets/audio/abc123.mp3" />)
    expect(container.textContent).toContain('Your browser does not support audio playback.')
  })
})

// ─── Accessibility contract ──────────────────────────────────────────────────

describe('AudioPlayer — accessibility', () => {
  test('has aria-label including post title when title is provided', () => {
    const { container } = render(
      <AudioPlayer audioPath="/assets/audio/abc123.mp3" title="Thai Animals Vocabulary" />
    )
    const audio = container.querySelector('audio')
    expect(audio).toHaveAttribute('aria-label', 'Audio for Thai Animals Vocabulary')
  })

  test('has generic aria-label when title is not provided', () => {
    const { container } = render(<AudioPlayer audioPath="/assets/audio/abc123.mp3" />)
    const audio = container.querySelector('audio')
    expect(audio).toHaveAttribute('aria-label', 'Audio player')
  })
})

// ─── Props contract ──────────────────────────────────────────────────────────

describe('AudioPlayer — props', () => {
  test('applies className prop to <audio> element', () => {
    const { container } = render(
      <AudioPlayer audioPath="/assets/audio/abc123.mp3" className="post-audio-player" />
    )
    const audio = container.querySelector('audio')
    expect(audio).toHaveClass('post-audio-player')
  })

  test('works without optional title prop', () => {
    expect(() => render(<AudioPlayer audioPath="/assets/audio/abc123.mp3" />)).not.toThrow()
  })

  test('works without optional className prop', () => {
    expect(() =>
      render(<AudioPlayer audioPath="/assets/audio/abc123.mp3" title="Test" />)
    ).not.toThrow()
  })

  test('accepts external URL as audioPath', () => {
    const { container } = render(<AudioPlayer audioPath="https://cdn.example.com/audio/thai.mp3" />)
    const source = container.querySelector('source')
    expect(source).toHaveAttribute('src', 'https://cdn.example.com/audio/thai.mp3')
  })
})

// ─── Error state ─────────────────────────────────────────────────────────────

describe('AudioPlayer — error handling', () => {
  test('shows error message when audio fails to load', () => {
    const { container } = render(<AudioPlayer audioPath="/assets/audio/missing.mp3" />)
    const audio = container.querySelector('audio')
    expect(audio).toBeInTheDocument()

    // Trigger the onError handler
    fireEvent.error(audio!)

    // Audio element should be replaced with error message
    expect(container.querySelector('audio')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toContain('Audio unavailable')
  })

  test('page does not crash when audio is missing (no uncaught error)', () => {
    const { container } = render(<AudioPlayer audioPath="/assets/audio/missing.mp3" />)
    const audio = container.querySelector('audio')

    expect(() => fireEvent.error(audio!)).not.toThrow()
  })
})
