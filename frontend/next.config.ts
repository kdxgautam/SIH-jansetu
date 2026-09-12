import type { NextConfig } from "next";

// The portal loads no third-party script, style, font, frame or endpoint, so every
// source stays on this origin. Inline scripts and styles are allowed because Next
// emits its bootstrap inline and React writes inline styles; the alternative, a
// per-request nonce, would opt every page out of static rendering. Everything a
// cross-site injection needs in order to reach elsewhere is still refused.
//
// Development additionally needs 'unsafe-eval', because React rebuilds call stacks
// with eval() for its debugging tools, and a websocket for hot reload. Neither is
// ever sent in production: React does not use eval() there.
const development = process.env.NODE_ENV === "development";
const POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src 'self'${development ? " ws: wss:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(development ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const config: NextConfig = {
  devIndicators: false,
  // 65 is for decorative images below the fold. It also keeps the role panel's
  // photograph from resolving to the same optimizer URL as the hero, which shares
  // the same file: Next keys its development LCP check by that URL, and a lazy
  // image sharing it makes the eager hero look lazy.
  images: { qualities: [65, 75] },
  experimental: { proxyClientMaxBodySize: "21mb", proxyTimeout: 120_000, useTypeScriptCli: false },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Content-Security-Policy", value: POLICY },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self)" },
    ] }];
  },
};
export default config;
