import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["@repo/ui", "@repo/types", "@repo/supabase"],
  // Next.js 16's dev server only allows "localhost" for cross-origin dev
  // requests (HMR websocket + internal RSC/navigation fetches) by default —
  // 127.0.0.1 is silently blocked even on the same machine, which breaks
  // client-side router.push() with no visible error. Dev-only setting.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
