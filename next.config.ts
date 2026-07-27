import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained build in .next/standalone (needed for Docker)
  output: 'standalone',


  // Playwright and node-cron are Node.js-only; exclude from client bundle
  serverExternalPackages: ['playwright', 'playwright-core', 'node-cron'],
};

export default nextConfig;
