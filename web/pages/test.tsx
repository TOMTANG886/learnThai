import Head from 'next/head'
import * as Sentry from '@sentry/nextjs'

export default function TestPage() {
  function triggerTestError() {
    Sentry.captureException(new Error('Test error from /test page'))
  }

  function triggerTestLog() {
    Sentry.logger.info('Test log from /test page', { page: '/test' })
  }

  return (
    <>
      <Head>
        <title>Sentry Test</title>
      </Head>
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Sentry Test Page</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={triggerTestError}>Send Test Error</button>
          <button onClick={triggerTestLog}>Send Test Log</button>
        </div>
      </main>
    </>
  )
}
