import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import type { GetStaticProps, GetStaticPaths } from 'next'
import type { WorksheetData, WorksheetRow } from '../../types'

interface WorksheetPageProps {
  worksheet: WorksheetData | null
}

const HIDDEN_COLUMNS = new Set([
  'title',
  'slug',
  'body_markdown',
  'publish_flag',
  '_slug',
  '_audioPath',
  'audio',
  'audio_url',
])

function getRowAudioPath(row: WorksheetRow): string {
  return (
    row['_audioPath'] ?? row['audio'] ?? row['Audio'] ?? row['audio_url'] ?? row['Audio_url'] ?? ''
  )
}

export default function WorksheetPage({ worksheet }: WorksheetPageProps) {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.load()
    el.play().catch(() => {})
  }, [playingIdx])

  if (!worksheet) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Worksheet not found</h1>
        <Link href="/">← Back to home</Link>
      </div>
    )
  }

  const { worksheetName, columns, rows } = worksheet
  const publishedRows = rows.filter(
    (row) => (row['publish_flag'] ?? '').trim().toUpperCase() === 'TRUE'
  )
  const visibleColumns = columns.filter((col) => !HIDDEN_COLUMNS.has(col.toLowerCase()))

  const currentAudioPath = playingIdx !== null ? getRowAudioPath(publishedRows[playingIdx]) : ''

  function handleRowClick(idx: number) {
    const audioPath = getRowAudioPath(publishedRows[idx])
    if (!audioPath) return
    if (playingIdx === idx) {
      audioRef.current?.pause()
      setPlayingIdx(null)
    } else {
      setPlayingIdx(idx)
    }
  }

  return (
    <>
      <Head>
        <title>{worksheetName}</title>
        <meta name="description" content={`Worksheet: ${worksheetName}`} />
      </Head>
      <main
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}
      >
        <nav style={{ marginBottom: '1.5rem' }}>
          <Link href="/">← Home</Link>
        </nav>

        <h1 style={{ marginBottom: '0.5rem' }}>{worksheetName}</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          {publishedRows.length} row{publishedRows.length !== 1 ? 's' : ''}
          {' · '}
          <span style={{ fontSize: '0.85rem' }}>Click a row to play its audio</span>
        </p>

        {/* Hidden single audio element controlled by state */}
        {currentAudioPath && (
          <audio ref={audioRef} src={currentAudioPath} preload="auto" style={{ display: 'none' }} />
        )}

        {publishedRows.length === 0 ? (
          <p>No rows found in this worksheet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px 12px',
                      background: '#f5f5f5',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      width: '2rem',
                    }}
                  />
                  {visibleColumns.map((col) => (
                    <th
                      key={col}
                      style={{
                        border: '1px solid #ddd',
                        padding: '8px 12px',
                        background: '#f5f5f5',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {publishedRows.map((row, idx) => {
                  const hasAudio = Boolean(getRowAudioPath(row))
                  const isPlaying = playingIdx === idx
                  return (
                    <tr
                      key={idx}
                      onClick={() => handleRowClick(idx)}
                      style={{
                        background: isPlaying ? '#e8f4fd' : idx % 2 === 0 ? '#fff' : '#fafafa',
                        cursor: hasAudio ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                        outline: isPlaying ? '2px solid #0070f3' : 'none',
                        outlineOffset: '-2px',
                      }}
                      onMouseEnter={(e) => {
                        if (hasAudio && !isPlaying) e.currentTarget.style.background = '#f0f7ff'
                      }}
                      onMouseLeave={(e) => {
                        if (!isPlaying)
                          e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'
                      }}
                    >
                      {/* Speaker icon column */}
                      <td
                        style={{
                          border: '1px solid #ddd',
                          padding: '8px 8px',
                          textAlign: 'center',
                          fontSize: '1rem',
                          color: isPlaying ? '#0070f3' : '#ccc',
                        }}
                      >
                        {hasAudio ? (isPlaying ? '🔊' : '🔈') : ''}
                      </td>
                      {visibleColumns.map((col) => (
                        <td
                          key={col}
                          style={{
                            border: '1px solid #ddd',
                            padding: '8px 12px',
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {row[col] ?? ''}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const worksheetsDir = path.join(process.cwd(), 'public', 'data', 'worksheets')

  if (!fs.existsSync(worksheetsDir)) {
    return { paths: [], fallback: false }
  }

  const files = fs.readdirSync(worksheetsDir).filter((f) => f.endsWith('.json'))
  const paths = files.map((file) => ({
    params: { worksheet: file.replace('.json', '') },
  }))

  return { paths, fallback: false }
}

export const getStaticProps: GetStaticProps<WorksheetPageProps> = async ({ params }) => {
  const worksheet = params?.worksheet as string
  const wsFile = path.join(process.cwd(), 'public', 'data', 'worksheets', `${worksheet}.json`)

  if (!fs.existsSync(wsFile)) {
    return { notFound: true }
  }

  const worksheetData: WorksheetData = JSON.parse(fs.readFileSync(wsFile, 'utf8'))
  const audioDir = path.join(process.cwd(), 'public', 'assets', 'audio')

  // Inject _audioPath into each row by computing the same hash tts-service uses:
  // sha256(thaiText + JSON.stringify({lang:'th',format:'mp3'})) → /assets/audio/{hash}.mp3
  const ttsOptsStr = JSON.stringify({ lang: 'th', format: 'mp3' })
  worksheetData.rows = worksheetData.rows.map((row) => {
    const thaiText = row['Thai'] ?? row['thai'] ?? ''
    if (!thaiText) return row
    const hash = crypto
      .createHash('sha256')
      .update(thaiText + ttsOptsStr)
      .digest('hex')
    const audioFile = path.join(audioDir, `${hash}.mp3`)
    if (fs.existsSync(audioFile)) {
      return { ...row, _audioPath: `/assets/audio/${hash}.mp3` }
    }
    return row
  })

  return {
    props: { worksheet: worksheetData },
  }
}
