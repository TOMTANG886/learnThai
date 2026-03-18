import fs from 'fs'
import path from 'path'
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

function credentialsFromEnvVars(): object | null {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) return null
  return {
    type: process.env.GOOGLE_TYPE || 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url:
      process.env.GOOGLE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
  }
}

export async function getSheetsClient() {
  let credentials: object

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    } catch (err) {
      throw new Error(
        '[sheets-client] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ' + (err as Error).message
      )
    }
  } else {
    const fromVars = credentialsFromEnvVars()
    if (fromVars) {
      credentials = fromVars
    } else {
      const credPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './credential.json')
      if (!fs.existsSync(credPath)) {
        throw new Error(
          `[sheets-client] Credential file not found at ${credPath}. Set GOOGLE_SERVICE_ACCOUNT_PATH, GOOGLE_SERVICE_ACCOUNT_JSON, or individual GOOGLE_* env vars.`
        )
      }
      try {
        credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'))
      } catch (err) {
        throw new Error(
          `[sheets-client] Failed to read credential file at ${credPath}: ` + (err as Error).message
        )
      }
    }
  }

  const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES })
  return google.sheets({ version: 'v4', auth })
}

export async function fetchWorksheet(
  spreadsheetId: string,
  worksheetName: string,
  maxRetries: number = 5
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const sheets = await getSheetsClient()
  let attempt = 0

  while (true) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: worksheetName,
      })
      const values = response.data.values || []
      if (values.length === 0) return { headers: [], rows: [] }

      const headers = values[0].map((h) => String(h).trim())
      const rows = values.slice(1).map((row) => {
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => {
          obj[h] = row[i] !== undefined ? String(row[i]).trim() : ''
        })
        return obj
      })

      return { headers, rows }
    } catch (err) {
      const anyErr = err as { response?: { status?: number }; code?: number | string }
      const status = anyErr?.response?.status ?? anyErr?.code
      const isRateLimit = status === 429 || status === 503

      if (isRateLimit && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500
        console.warn(
          `[sheets-client] Rate limited (attempt ${attempt + 1}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`
        )
        await new Promise((r) => setTimeout(r, delay))
        attempt++
        continue
      }

      throw new Error(
        `[sheets-client] Failed to fetch worksheet "${worksheetName}": ` + (err as Error).message
      )
    }
  }
}

export async function listWorksheets(spreadsheetId: string): Promise<string[]> {
  const sheets = await getSheetsClient()
  const response = await sheets.spreadsheets.get({ spreadsheetId })
  return (response.data.sheets || []).map((s) => s.properties?.title ?? '')
}
