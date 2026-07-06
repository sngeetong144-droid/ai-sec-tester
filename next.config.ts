import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    const frameHeaders = isDev
      ? [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors http://localhost:8787 http://127.0.0.1:8787",
          },
        ]
      : [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ];

    return [
      {
        source: "/(.*)",
        headers: frameHeaders,
      },
    ];
  },
};

export default nextConfig;
