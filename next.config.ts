import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Required for react-diff-viewer-continued (uses browser APIs)
  serverExternalPackages: [],
};

export default nextConfig;
