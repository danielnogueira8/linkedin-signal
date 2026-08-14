import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // "Wind tunnel" was renamed to "AI Arena"
    return [{ source: "/app/windtunnel", destination: "/app/arena", permanent: true }];
  },
};

export default nextConfig;
