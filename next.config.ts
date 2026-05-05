import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [],
  async headers() {
    return [
      {
        // Scope COOP/COEP to the editor route only — WebContainers require these.
        // Applying globally would break cross-origin iframes and OAuth redirects elsewhere.
        source: "/dashboard/repo/:connectionId/:repoName/edit",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
