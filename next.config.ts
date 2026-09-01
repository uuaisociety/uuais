import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  agentRules: false,
  devIndicators: false,
  experimental: {
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      }
    ],
  },
  async redirects() {
    return [
      // Contact was merged into /about.
      {
        source: "/contact",
        destination: "/about#contact",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // A report-only CSP produced browser Issues-panel violations for the
          // Firebase Auth / Google sign-in iframes the app loads and for Next's
          // inline scripts, failing the Lighthouse inspector-issues audit. A
          // strict enforcement CSP is a follow-up once the app's third-party
          // and inline-script usage is catalogued.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
