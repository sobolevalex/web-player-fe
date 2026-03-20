import type { NextConfig } from "next";

// When frontend uses same-origin (empty API URL), proxy /api and /media to backend.
// In Docker, backend is reachable at backend:8000; for local dev set BACKEND_INTERNAL_URL=http://localhost:8000
const backendUrl =
  process.env.BACKEND_INTERNAL_URL || "http://backend:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/media/:path*", destination: `${backendUrl}/media/:path*` },
    ];
  },
};

export default nextConfig;
