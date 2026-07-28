import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Produces a self-contained build in .next/standalone (needed for Docker)
  output: 'standalone',

  // Pin the workspace root so standalone output isn't nested under a
  // wrongly-inferred root (e.g. a stray lockfile elsewhere on the machine).
  turbopack: {
    root: path.join(__dirname),
  },

  // Playwright and node-cron are Node.js-only; exclude from client bundle
  serverExternalPackages: ['playwright', 'playwright-core', 'node-cron'],
};

export default nextConfig;
