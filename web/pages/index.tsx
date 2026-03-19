import fs from 'fs'
import path from 'path'
import Head from 'next/head'
import type { GetStaticProps } from 'next'
import type { WorksheetMeta } from '../types'
import Link from 'next/link'
interface HomePageProps {
  worksheets: WorksheetMeta[]
}

export default function HomePage({ worksheets }: HomePageProps) {
  return (
    <>
      <Head>
        <title>Learn Thai</title>
        <meta name="description" content="Learn Thai vocabulary and phrases by topic" />
      </Head>
      <main
        style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}
      >
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🇹🇭 Learn Thai</h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            Browse vocabulary and phrases by topic
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {worksheets.map(({ worksheetName, worksheetSlug, rowCount }) => (
            <Link
              key={worksheetSlug}
              href={`/worksheets/${worksheetSlug}/`}
              style={{
                display: 'block',
                textDecoration: 'none',
                border: '1px solid #e0e0e0',
                borderRadius: '10px',
                padding: '1.25rem 1.5rem',
                background: '#fff',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                color: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'
                e.currentTarget.style.borderColor = '#0070f3'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = '#e0e0e0'
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                {worksheetName}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#888' }}>
                {rowCount} {rowCount === 1 ? 'word' : 'words'}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const manifestPath = path.join(process.cwd(), 'public', 'data', 'manifest.json')

  if (!fs.existsSync(manifestPath)) {
    return { props: { worksheets: [] } }
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const worksheets = (manifest.worksheets || []).filter((w: WorksheetMeta) => w.rowCount > 0)

  return { props: { worksheets } }
}
