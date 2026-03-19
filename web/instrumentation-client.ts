import * as Sentry from '@sentry/nextjs'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
    Sentry.replayIntegration(),
    Sentry.browserProfilingIntegration(),
  ],
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  profilesSampleRate: 1.0, // 100% of transactions will be profiled
})
