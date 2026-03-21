/// <reference types="vitest/globals" />
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock googleapis before any imports ──────────────────────────────────────
// vi.mock factories are hoisted, so shared mock fns must use vi.hoisted()

const { mockValuesGet, mockSpreadsheetsGet } = vi.hoisted(() => ({
  mockValuesGet: vi.fn(),
  mockSpreadsheetsGet: vi.fn(),
}))

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({})),
    },
    sheets: vi.fn().mockReturnValue({
      spreadsheets: {
        values: { get: mockValuesGet },
        get: mockSpreadsheetsGet,
      },
    }),
  },
}))

import { getSheetsClient, fetchWorksheet, listWorksheets } from '../../scripts/sheets-client'

// ─── getSheetsClient ─────────────────────────────────────────────────────────

describe('getSheetsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    delete process.env.GOOGLE_CLIENT_EMAIL
    delete process.env.GOOGLE_PRIVATE_KEY
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PATH
  })

  test('succeeds when GOOGLE_SERVICE_ACCOUNT_JSON is set to valid JSON', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}'
    await expect(getSheetsClient()).resolves.toBeDefined()
  })

  test('throws on malformed GOOGLE_SERVICE_ACCOUNT_JSON', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = 'not-valid-json'
    await expect(getSheetsClient()).rejects.toThrow('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON')
  })

  test('succeeds using individual GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY env vars', async () => {
    process.env.GOOGLE_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com'
    process.env.GOOGLE_PRIVATE_KEY =
      '-----BEGIN RSA PRIVATE KEY-----\\ntest\\n-----END RSA PRIVATE KEY-----'
    await expect(getSheetsClient()).resolves.toBeDefined()
  })

  test('throws "Credential file not found" when no credentials are available', async () => {
    // Point to a path that definitely does not exist so real fs.existsSync returns false
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH = '/no/such/path/credential.json'
    await expect(getSheetsClient()).rejects.toThrow('Credential file not found')
  })
})

// ─── fetchWorksheet ──────────────────────────────────────────────────────────

describe('fetchWorksheet', () => {
  beforeEach(() => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}'
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    vi.useRealTimers()
  })

  test('returns empty headers and rows when API returns no values', async () => {
    mockValuesGet.mockResolvedValueOnce({ data: { values: [] } })
    const result = await fetchWorksheet('sheet-id', 'Sheet1')
    expect(result).toEqual({ headers: [], rows: [] })
  })

  test('returns empty when API response has no values field', async () => {
    mockValuesGet.mockResolvedValueOnce({ data: {} })
    const result = await fetchWorksheet('sheet-id', 'Sheet1')
    expect(result).toEqual({ headers: [], rows: [] })
  })

  test('parses first row as headers and remaining rows as data objects', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          ['Thai', 'English'],
          ['แมว', 'Cat'],
          ['หมา', 'Dog'],
        ],
      },
    })
    const result = await fetchWorksheet('sheet-id', 'Sheet1')
    expect(result.headers).toEqual(['Thai', 'English'])
    expect(result.rows).toEqual([
      { Thai: 'แมว', English: 'Cat' },
      { Thai: 'หมา', English: 'Dog' },
    ])
  })

  test('trims whitespace from headers', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: { values: [['  Thai  ', ' English '], ['แมว', 'Cat']] },
    })
    const result = await fetchWorksheet('sheet-id', 'Sheet1')
    expect(result.headers).toEqual(['Thai', 'English'])
  })

  test('trims whitespace from cell values', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: { values: [['Thai'], ['  แมว  ']] },
    })
    const result = await fetchWorksheet('sheet-id', 'Sheet1')
    expect(result.rows[0]).toEqual({ Thai: 'แมว' })
  })

  test('fills missing cells with empty string when row is shorter than headers', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: { values: [['Thai', 'English', 'Notes'], ['แมว', 'Cat']] },
    })
    const result = await fetchWorksheet('sheet-id', 'Sheet1')
    expect(result.rows[0]).toEqual({ Thai: 'แมว', English: 'Cat', Notes: '' })
  })

  test('throws immediately on non-rate-limit errors without retrying', async () => {
    mockValuesGet.mockRejectedValueOnce(new Error('auth failed'))
    await expect(fetchWorksheet('sheet-id', 'Sheet1')).rejects.toThrow(
      'Failed to fetch worksheet "Sheet1"'
    )
    expect(mockValuesGet).toHaveBeenCalledTimes(1)
  })

  test('retries on 429 rate limit and returns result on success', async () => {
    vi.useFakeTimers()
    const rateError = Object.assign(new Error('rate limited'), { response: { status: 429 } })
    mockValuesGet
      .mockRejectedValueOnce(rateError)
      .mockResolvedValueOnce({ data: { values: [['Thai'], ['แมว']] } })

    // Start the call, advance fake timers to skip the retry delay, then await result
    const resultPromise = fetchWorksheet('sheet-id', 'Sheet1', 1)
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.headers).toEqual(['Thai'])
    expect(mockValuesGet).toHaveBeenCalledTimes(2)
  })

  test('retries on 503 service unavailable and returns result on success', async () => {
    vi.useFakeTimers()
    const rateError = Object.assign(new Error('service unavailable'), {
      response: { status: 503 },
    })
    mockValuesGet
      .mockRejectedValueOnce(rateError)
      .mockResolvedValueOnce({ data: { values: [['Thai'], ['หมา']] } })

    const resultPromise = fetchWorksheet('sheet-id', 'Sheet1', 1)
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.headers).toEqual(['Thai'])
    expect(mockValuesGet).toHaveBeenCalledTimes(2)
  })

  test('throws after exhausting all retries on persistent 429', async () => {
    vi.useFakeTimers()
    const rateError = Object.assign(new Error('rate limited'), { response: { status: 429 } })
    mockValuesGet.mockRejectedValue(rateError)

    // Attach the rejection handler BEFORE advancing timers to avoid unhandled rejection
    const assertReject = expect(
      fetchWorksheet('sheet-id', 'Sheet1', 1)
    ).rejects.toThrow('Failed to fetch worksheet "Sheet1"')
    await vi.runAllTimersAsync()
    await assertReject
  })
})

// ─── listWorksheets ──────────────────────────────────────────────────────────

describe('listWorksheets', () => {
  beforeEach(() => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}'
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  })

  test('returns a list of worksheet titles', async () => {
    mockSpreadsheetsGet.mockResolvedValueOnce({
      data: {
        sheets: [{ properties: { title: 'Animals' } }, { properties: { title: 'Colors' } }],
      },
    })
    const result = await listWorksheets('sheet-id')
    expect(result).toEqual(['Animals', 'Colors'])
  })

  test('returns empty array when spreadsheet has no sheets', async () => {
    mockSpreadsheetsGet.mockResolvedValueOnce({ data: {} })
    const result = await listWorksheets('sheet-id')
    expect(result).toEqual([])
  })

  test('uses empty string for sheets missing a title property', async () => {
    mockSpreadsheetsGet.mockResolvedValueOnce({
      data: {
        sheets: [{ properties: {} }, { properties: { title: 'Colors' } }],
      },
    })
    const result = await listWorksheets('sheet-id')
    expect(result).toEqual(['', 'Colors'])
  })
})
