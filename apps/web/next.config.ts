import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Disable static generation globally - all pages are rendered at runtime
  // This prevents build failures when Supabase/API env vars are not available at build time
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
