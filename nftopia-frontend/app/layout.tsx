import localFont from "next/font/local";
import "./globals.css";
import ApolloWrapper from "@/lib/graphql/apollo-wrapper";
import { AuthProvider } from "@/lib/context/AuthContext";
import dynamic from "next/dynamic";
import ExperimentProviderWrapper from '@/lib/experiments/ExperimentProvider';

// ─── SAFE COMPILER SEPARATION ──────────────────────────────────────────
// Pulling in your isolated TelemetryProvider file with SSR disabled.
// This completely detaches 'useTelemetry' references from your Server tree.
const TelemetryProvider = dynamic(
  () => import("./TelemetryProvider"),
  { ssr: false }
);

const inter = localFont({
  src: "../public/fonts/inter-var.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-inter",
  fallback: ['system-ui', 'arial'],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: 'Stellar-LumenMint — Discover, Collect & Trade NFTs',
  description: 'The premier NFT marketplace on Stellar. Discover, collect, and trade unique digital assets with secure, fast, low-fee transactions.',
  manifest: '/manifest.json',
  themeColor: '#0D1117',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stellar-LumenMint',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/stellar-lumenmint-mark.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/stellar-lumenmint-mark.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'Stellar-LumenMint',
    title: 'Stellar-LumenMint — Discover, Collect & Trade NFTs',
    description: 'The premier NFT marketplace on Stellar. Discover, collect, and trade unique digital assets.',
    images: ['/stellar-lumenmint-mark.svg'],
  },
  twitter: {
    card: 'summary',
    title: 'Stellar-LumenMint — Discover, Collect & Trade NFTs',
    description: 'The premier NFT marketplace on Stellar. Discover, collect, and trade unique digital assets.',
    images: ['/stellar-lumenmint-mark.svg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="mt-0 pt-0 border-t-0">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0D1117" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Stellar-LumenMint" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0D1117" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="icon" href="/stellar-lumenmint-mark.svg" />
        <link rel="shortcut icon" href="/stellar-lumenmint-mark.svg" />
        <link rel="apple-touch-icon" href="/stellar-lumenmint-mark.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileImage" content="/stellar-lumenmint-mark.svg" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={inter.className}>
        <TelemetryProvider />
        <ExperimentProviderWrapper>
          <AuthProvider>
            <ApolloWrapper>{children}</ApolloWrapper>
          </AuthProvider>
        </ExperimentProviderWrapper>
      </body>
    </html>
  );
}
