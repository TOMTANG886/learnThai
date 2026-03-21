/// <reference types="vitest/globals" />
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorksheetPage from '../../pages/worksheets/[worksheet]'
import type { WorksheetData } from '../../types'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/head', () => ({ default: () => null }))

beforeAll(() => {
  window.HTMLMediaElement.prototype.load = vi.fn()
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  window.HTMLMediaElement.prototype.pause = vi.fn()
})

/** Builds a worksheet fixture. Override individual fields as needed. */
function makeWorksheet(overrides?: Partial<WorksheetData>): WorksheetData {
  return {
    worksheetName: 'Animals',
    worksheetSlug: 'animals',
    columns: ['Thai', 'English', 'publish_flag', 'title', 'slug'],
    rows: [
      { Thai: 'สัตว์', English: 'Animal', publish_flag: 'TRUE' },
      {
        Thai: 'แมว',
        English: 'Cat',
        publish_flag: 'TRUE',
        _audioPath: '/assets/audio/abc.mp3',
      },
      { Thai: 'หมา', English: 'Dog', publish_flag: 'FALSE' },
    ],
    ...overrides,
  }
}

// ─── Null / not-found state ───────────────────────────────────────────────────

describe('WorksheetPage — null state', () => {
  test('renders "Worksheet not found" heading when worksheet is null', () => {
    render(<WorksheetPage worksheet={null} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Worksheet not found')
  })

  test('shows a link back to home when worksheet is null', () => {
    render(<WorksheetPage worksheet={null} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/')
  })
})

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('WorksheetPage — rendering', () => {
  test('renders the worksheet name as the page heading', () => {
    render(<WorksheetPage worksheet={makeWorksheet()} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Animals')
  })

  test('hides columns listed in HIDDEN_COLUMNS', () => {
    render(<WorksheetPage worksheet={makeWorksheet()} />)
    const headers = screen.queryAllByRole('columnheader').map((el) => el.textContent)
    expect(headers).not.toContain('title')
    expect(headers).not.toContain('slug')
    expect(headers).not.toContain('publish_flag')
  })

  test('shows non-hidden columns as table headers', () => {
    render(<WorksheetPage worksheet={makeWorksheet()} />)
    expect(screen.getByRole('columnheader', { name: 'Thai' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'English' })).toBeInTheDocument()
  })

  test('only renders rows where publish_flag === "TRUE"', () => {
    render(<WorksheetPage worksheet={makeWorksheet()} />)
    expect(screen.getByText('สัตว์')).toBeInTheDocument()
    expect(screen.getByText('แมว')).toBeInTheDocument()
    expect(screen.queryByText('หมา')).not.toBeInTheDocument() // publish_flag: 'FALSE'
  })

  test('shows published row count', () => {
    render(<WorksheetPage worksheet={makeWorksheet()} />)
    expect(screen.getByText(/2 rows/)).toBeInTheDocument()
  })

  test('shows "1 row" (singular) for a single published row', () => {
    const ws = makeWorksheet({
      rows: [{ Thai: 'แมว', English: 'Cat', publish_flag: 'TRUE' }],
    })
    render(<WorksheetPage worksheet={ws} />)
    expect(screen.getByText(/1 row[^s]/)).toBeInTheDocument()
  })

  test('shows "No rows found" message when no published rows exist', () => {
    const ws = makeWorksheet({
      rows: [{ Thai: 'หมา', English: 'Dog', publish_flag: 'FALSE' }],
    })
    render(<WorksheetPage worksheet={ws} />)
    expect(screen.getByText('No rows found in this worksheet.')).toBeInTheDocument()
  })
})

// ─── Audio icons ──────────────────────────────────────────────────────────────

describe('WorksheetPage — audio icons', () => {
  test('shows speaker icon 🔈 for rows that have an audio path', () => {
    render(<WorksheetPage worksheet={makeWorksheet()} />)
    expect(screen.getByText('🔈')).toBeInTheDocument()
  })

  test('shows no speaker icon for rows without audio', () => {
    const ws = makeWorksheet({
      rows: [{ Thai: 'สัตว์', English: 'Animal', publish_flag: 'TRUE' }],
    })
    render(<WorksheetPage worksheet={ws} />)
    expect(screen.queryByText('🔈')).not.toBeInTheDocument()
    expect(screen.queryByText('🔊')).not.toBeInTheDocument()
  })

  test('does not render the hidden audio element when nothing is playing', () => {
    const { container } = render(<WorksheetPage worksheet={makeWorksheet()} />)
    expect(container.querySelector('audio')).not.toBeInTheDocument()
  })
})

// ─── Row click interactions ───────────────────────────────────────────────────

describe('WorksheetPage — row click interactions', () => {
  test('renders audio element with correct src after clicking a row that has audio', () => {
    const { container } = render(<WorksheetPage worksheet={makeWorksheet()} />)
    const rows = container.querySelectorAll('tbody tr')
    fireEvent.click(rows[1]) // row index 1 = แมว, has _audioPath
    const audio = container.querySelector('audio')
    expect(audio).toBeInTheDocument()
    expect(audio).toHaveAttribute('src', '/assets/audio/abc.mp3')
  })

  test('shows 🔊 icon on the playing row', () => {
    const { container } = render(<WorksheetPage worksheet={makeWorksheet()} />)
    const rows = container.querySelectorAll('tbody tr')
    fireEvent.click(rows[1])
    expect(screen.getByText('🔊')).toBeInTheDocument()
  })

  test('stops playback and hides audio element when the same row is clicked again', () => {
    const { container } = render(<WorksheetPage worksheet={makeWorksheet()} />)
    const rows = container.querySelectorAll('tbody tr')
    fireEvent.click(rows[1]) // start
    fireEvent.click(rows[1]) // stop
    expect(container.querySelector('audio')).not.toBeInTheDocument()
    expect(screen.queryByText('🔊')).not.toBeInTheDocument()
  })

  test('does not start playback when clicking a row that has no audio', () => {
    const { container } = render(<WorksheetPage worksheet={makeWorksheet()} />)
    const rows = container.querySelectorAll('tbody tr')
    fireEvent.click(rows[0]) // สัตว์ — no audio
    expect(container.querySelector('audio')).not.toBeInTheDocument()
  })

  test('switches playback to a different row when another row is clicked', () => {
    const ws = makeWorksheet({
      rows: [
        { Thai: 'แมว', English: 'Cat', publish_flag: 'TRUE', _audioPath: '/assets/audio/cat.mp3' },
        {
          Thai: 'หมา',
          English: 'Dog',
          publish_flag: 'TRUE',
          _audioPath: '/assets/audio/dog.mp3',
        },
      ],
    })
    const { container } = render(<WorksheetPage worksheet={ws} />)
    const rows = container.querySelectorAll('tbody tr')
    fireEvent.click(rows[0]) // play cat
    fireEvent.click(rows[1]) // switch to dog
    expect(container.querySelector('audio')).toHaveAttribute('src', '/assets/audio/dog.mp3')
  })
})
