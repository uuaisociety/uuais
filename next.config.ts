import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMAGE_REMOTE_PATTERNS } from './lib/image-hosts';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /* config options here */
  agentRules: false,
  devIndicators: false,
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  // Keeps the Node build (with its jsdom window) on the server; the browser
  // build would be a no-op sanitizer there.
  serverExternalPackages: ['isomorphic-dompurify'],
  experimental: {
    useTypeScriptCli: false,
    instantInsights: {
      validationLevel: 'manual-warning',
    },
  },
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Only the app's own buckets (see lib/image-hosts.ts).
    remotePatterns: IMAGE_REMOTE_PATTERNS,
  },
  async redirects() {
    return [
      // Contact was merged into /about.
      {
        source: '/contact',
        destination: '/about#contact',
        permanent: true,
      },
      // The study-plan placeholder was superseded by the programme map.
      {
        source: '/study-plan',
        destination: '/programs',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // A report-only CSP produced browser Issues-panel violations for the
          // Firebase Auth / Google sign-in iframes the app loads and for Next's
          // inline scripts, failing the Lighthouse inspector-issues audit. A
          // strict enforcement CSP is a follow-up once the app's third-party
          // and inline-script usage is catalogued.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
