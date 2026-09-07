import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile elsewhere on this machine (outside the project) made
  // Next.js infer the wrong workspace root. Pin it explicitly.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
