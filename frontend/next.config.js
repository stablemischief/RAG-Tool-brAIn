/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type checking happens in CI/CD, don't block local dev
    ignoreBuildErrors: process.env.IGNORE_TS_ERRORS === 'true',
  },
  eslint: {
    // ESLint checking happens in CI/CD, don't block local dev
    ignoreDuringBuilds: process.env.IGNORE_ESLINT === 'true',
  },
  experimental: {
    // Enable Server Actions for form handling
    serverActions: true,
  },
  // Enable WebSocket support for real-time updates
  rewrites: async () => [
    {
      source: '/api/ws/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL}/ws/:path*`,
    },
  ],
  // Proxy API calls to backend
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // Optimize for production deployment
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  // File upload handling
  experimental: {
    // Allow larger file uploads for service account JSON
    isrMemoryCacheSize: 0,
  },
};

module.exports = nextConfig;