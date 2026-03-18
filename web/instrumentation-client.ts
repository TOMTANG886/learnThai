import * as Sentry from '@sentry/nextjs'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,

  integrations: [
    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
    Sentry.breadcrumbsIntegration({
      console: true, // 捕捉 console.log, console.error 等
      dom: true, // 捕捉點擊與按鍵事件
      fetch: true, // 捕捉 HTTP 請求
    }),
  ],
  // Enable logs to be sent to Sentry
  enableLogs: true,
})
