import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile elsewhere on this machine (outside the project) made
  // Next.js infer the wrong workspace root. Pin it explicitly.
  outputFileTracingRoot: path.join(__dirname),

  // Phase 18 hardening. Deliberately per-path: /widget/* is the one
  // route in the app that *must* be embeddable cross-origin (a business
  // pastes it into an <iframe> on their own website — see
  // src/app/dashboard/agent/widget-panel.tsx) — X-Frame-Options there
  // would silently break the feature it exists for. Everywhere else
  // gets clickjacking protection.
  async headers() {
    return [
      {
        source: "/((?!widget/).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/widget/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
