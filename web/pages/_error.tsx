import * as Sentry from '@sentry/nextjs'
import type { NextPageContext } from 'next'

interface ErrorPageProps {
  statusCode?: number
}

export default function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{statusCode ? `${statusCode} — Server error` : 'An error occurred'}</h1>
    </div>
  )
}

ErrorPage.getInitialProps = async (ctx: NextPageContext) => {
  await Sentry.captureUnderscoreErrorException(ctx)
  return { statusCode: (ctx.res?.statusCode ?? ctx.err) ? 500 : 404 }
}
