import type { NextConfig } from "next";
import { getSiteEnvironment } from "./src/lookup/runtime";
import { buildAdminCsp, buildPublicCsp, supabaseOriginFrom } from "./src/lookup/security/csp";

// Evaluated at build time. LOOKUP_SITE_ENV (any host) or VERCEL_ENV decides the environment.
const isProductionSite = getSiteEnvironment() === "production";
const cspOptions = {
  development: process.env.NODE_ENV === "development",
  supabaseOrigin: supabaseOriginFrom(process.env.NEXT_PUBLIC_SUPABASE_URL),
};

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  env: {
    // Per-build cache key (src/lookup/cache.ts): each build/deployment reads fresh data from Supabase.
    LOOKUP_BUILD_ID: process.env.LOOKUP_BUILD_ID || String(Date.now()),
  },
  images: {
    // Images uploaded through the admin live in the Supabase Storage "media" bucket.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  async headers() {
    return [
      {
        source: "/((?!admin).*)",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy", value: buildPublicCsp(cspOptions) },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Preview and local builds must never be indexed.
          ...(isProductionSite ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy", value: buildAdminCsp(cspOptions) },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
