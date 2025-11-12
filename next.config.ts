import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
        hostname: "storage.googleapis.com"
      },
      {
        protocol: "https",
        hostname: "**.googleapis.com"
      },
    ],
  },
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
