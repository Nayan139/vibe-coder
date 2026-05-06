import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [
    "e2b",
    "@connectrpc/connect",
    "@connectrpc/connect-web",
    "@bufbuild/protobuf",
    "openapi-fetch",
    "tar",
    "glob",
  ],
};

export default nextConfig;
