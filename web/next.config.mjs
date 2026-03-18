import { withSentryConfig } from '@sentry/nextjs'

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: true,
  webpack: {
    // Disable server/edge Sentry (static export only)
    autoInstrumentServerFunctions: false,
  },
})
