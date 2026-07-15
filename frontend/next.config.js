/** @type {import('next').NextConfig} */

// LumenMint Next.js Configuration
// =====================================================================

const nextConfig = {
  // ── Image Optimization ─────────────────────────────────────────
  images: {
    // Allow external image sources (IPFS gateways, Stellar assets)
    domains: [
      'ipfs.io',
      'cloudflare-ipfs.com',
      'gateway.pinata.cloud',
      'nftstorage.link',
    ],
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

module.exports = nextConfig;
