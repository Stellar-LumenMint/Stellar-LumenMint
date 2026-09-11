/** @type {import('next').NextConfig} */

// LumenMint Next.js Configuration
// =====================================================================

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Next.js 13 has no nonce plumbing for its inline bootstrap scripts, so
// `'unsafe-inline'` is required; `'unsafe-eval'` is only needed by the dev
// bundler and is dropped from production. Everything else is locked to the
// app's own origin, which is what actually stops object injection,
// clickjacking, and base-tag hijacking.
const isProduction = process.env.NODE_ENV === 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // Explicitly list the transports the app uses (API, RPC, wallet bridges,
  // websockets) rather than allowing all schemes. `https:`/`wss:` cover the
  // configurable backend hosts; localhost is allowed for development.
  "connect-src 'self' https: wss: http://localhost:* ws://localhost:*",
].join('; ');

const nextConfig = {
  // ── Server Identity ────────────────────────────────────────────
  // Do not advertise that this is a Next.js application.
  poweredByHeader: false,

  // ── Image Optimization ─────────────────────────────────────────
  images: {
    // Allow external image sources (IPFS gateways, Stellar assets)
    domains: ['ipfs.io', 'cloudflare-ipfs.com', 'gateway.pinata.cloud', 'nftstorage.link'],
    // Use modern sharp format for optimized images
    formats: ['image/avif', 'image/webp'],
  },

  // ── Security Headers ───────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable browser features the app never uses and opt out of
          // cross-site isolation footguns for third-party embeds.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // Force HTTPS for two years on every host that ever serves this
          // app over TLS. Ignored on plain HTTP, so it is safe to always send.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        ],
      },
    ];
  },

  // ── Redirects ──────────────────────────────────────────────────
  async redirects() {
    return [
      // Legacy route redirects
      { source: '/nft/:id', destination: '/marketplace/:id', permanent: true },
    ];
  },

  // ── Experimental ───────────────────────────────────────────────
  experimental: {
    // Enable server actions for form handling
    serverActions: true,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
