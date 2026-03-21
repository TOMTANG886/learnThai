/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HomePage from '../../pages/index'
import type { WorksheetMeta } from '../../types'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/head', () => ({ default: () => null }))

const mockWorksheets: WorksheetMeta[] = [
  { worksheetName: 'Animals', worksheetSlug: 'animals', rowCount: 10 },
  { worksheetName: 'Colors', worksheetSlug: 'colors', rowCount: 5 },
  { worksheetName: 'Numbers', worksheetSlug: 'numbers', rowCount: 1 },
]

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('HomePage — rendering', () => {
  test('renders the main heading', () => {
    render(<HomePage worksheets={[]} />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  test('renders a card for each worksheet', () => {
    render(<HomePage worksheets={mockWorksheets} />)
    expect(screen.getByText('Animals')).toBeInTheDocument()
    expect(screen.getByText('Colors')).toBeInTheDocument()
    expect(screen.getByText('Numbers')).toBeInTheDocument()
  })

  test('renders no cards when worksheets list is empty', () => {
    const { container } = render(<HomePage worksheets={[]} />)
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  test('renders one card per worksheet', () => {
    const { container } = render(<HomePage worksheets={mockWorksheets} />)
    expect(container.querySelectorAll('a')).toHaveLength(mockWorksheets.length)
  })

  test('links each card to the correct worksheet URL', () => {
    render(<HomePage worksheets={[mockWorksheets[0]]} />)
    const link = screen.getByRole('link', { name: /Animals/ })
    expect(link).toHaveAttribute('href', '/worksheets/animals/')
  })
})

// ─── Word count labels ────────────────────────────────────────────────────────

describe('HomePage — word count labels', () => {
  test('shows "1 word" (singular) when rowCount === 1', () => {
    render(
      <HomePage
        worksheets={[{ worksheetName: 'Numbers', worksheetSlug: 'numbers', rowCount: 1 }]}
      />
    )
    expect(screen.getByText('1 word')).toBeInTheDocument()
  })

  test('shows "N words" (plural) when rowCount > 1', () => {
    render(
      <HomePage
        worksheets={[{ worksheetName: 'Animals', worksheetSlug: 'animals', rowCount: 10 }]}
      />
    )
    expect(screen.getByText('10 words')).toBeInTheDocument()
  })

  test('shows "0 words" (plural) when rowCount === 0', () => {
    render(
      <HomePage
        worksheets={[{ worksheetName: 'Empty', worksheetSlug: 'empty', rowCount: 0 }]}
      />
    )
    expect(screen.getByText('0 words')).toBeInTheDocument()
  })
})
