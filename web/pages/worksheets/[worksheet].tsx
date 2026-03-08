import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import Link from 'next/link';
import type { GetStaticProps, GetStaticPaths } from 'next';
import type { WorksheetData } from '../../types';

interface WorksheetPageProps {
  worksheet: WorksheetData | null;
}

const HIDDEN_COLUMNS = new Set(['title', 'slug', 'body_markdown', 'publish_flag', '_slug']);

export default function WorksheetPage({ worksheet }: WorksheetPageProps) {
  if (!worksheet) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Worksheet not found</h1>
        <Link href="/">← Back to home</Link>
      </div>
    );
  }

  const { worksheetName, columns, rows } = worksheet;
  const visibleColumns = columns.filter((col) => !HIDDEN_COLUMNS.has(col.toLowerCase()));

  return (
    <>
      <Head>
        <title>{worksheetName}</title>
        <meta name="description" content={`Worksheet: ${worksheetName}`} />
      </Head>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
        <nav style={{ marginBottom: '1.5rem' }}>
          <Link href="/">← Home</Link>
        </nav>

        <h1 style={{ marginBottom: '0.5rem' }}>{worksheetName}</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          {rows.length} row{rows.length !== 1 ? 's' : ''}
        </p>

        {rows.length === 0 ? (
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
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                  >
                    {visibleColumns.map((col) => {
                      const value = row[col] ?? '';
                      const isAudioUrl = col.toLowerCase() === 'audio_url';

                      return (
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
                          {isAudioUrl && value ? (
                            <a href={value} target="_blank" rel="noopener noreferrer">
                              🔊 Audio
                            </a>
                          ) : (
                            value
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const worksheetsDir = path.join(process.cwd(), 'public', 'data', 'worksheets');

  if (!fs.existsSync(worksheetsDir)) {
    return { paths: [], fallback: false };
  }

  const files = fs.readdirSync(worksheetsDir).filter((f) => f.endsWith('.json'));
  const paths = files.map((file) => ({
    params: { worksheet: file.replace('.json', '') },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<WorksheetPageProps> = async ({ params }) => {
  const worksheet = params?.worksheet as string;
  const wsFile = path.join(
    process.cwd(),
    'public',
    'data',
    'worksheets',
    `${worksheet}.json`
  );

  if (!fs.existsSync(wsFile)) {
    return { notFound: true };
  }

  const worksheetData: WorksheetData = JSON.parse(fs.readFileSync(wsFile, 'utf8'));

  return {
    props: { worksheet: worksheetData },
  };
};
