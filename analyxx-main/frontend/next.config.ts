import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project (set after creating Sentry project)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps to Sentry in CI only (requires SENTRY_AUTH_TOKEN)
  silent: !process.env.CI,

  // Automatically tree-shake Sentry logger statements in production
  disableLogger: true,

  // Route browser requests through Next.js tunnel to avoid ad-blockers
  tunnelRoute: "/monitoring-tunnel",
});