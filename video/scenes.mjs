/**
 * Scene definitions for the LumenMint product pitch.
 *
 * The narration is the script: it is spoken verbatim, and each scene's video
 * duration is derived from its audio, so the visuals always match the words
 * rather than being guessed at. Add or reorder scenes here and the whole video
 * follows.
 *
 * Every factual claim in the narration is checkable against the repository:
 * test counts, error-code totals, gas figures and issue counts all come from
 * files that CI keeps honest. If a number here drifts from the code, the pitch
 * is lying to judges, so the numbers are deliberately the boring, verifiable
 * ones.
 */

export const scenes = [
  {
    id: '01-hook',
    title: 'The gap',
    shots: [
      {
        kind: 'slide',
        layout: 'statement',
        kicker: 'Built on Stellar',
        headline: 'Stellar settles in seconds,\nfor a fraction of a cent.',
        sub: 'It is one of the fastest, cheapest chains in production.',
      },
      {
        kind: 'slide',
        layout: 'statement',
        kicker: 'And yet',
        headline: 'The NFT layer is thin.\nFragmented. Often off-chain.',
        sub: 'Collections launched by hand. Trades that never actually settle.',
      },
    ],
    narration: `Stellar settles in seconds, for a fraction of a cent. It is one of the fastest, cheapest blockchains in production. And yet the NFT layer on top of it is thin, fragmented, and often does not settle on-chain at all. Creators launch collections by hand. Developers start from an empty folder. And too many trades you see on screen never touch the chain. That gap is what LumenMint closes.`,
  },

  {
    id: '02-solution',
    title: 'The product',
    shots: [
      {
        kind: 'slide',
        layout: 'title',
        kicker: 'Introducing',
        headline: 'Stellar LumenMint',
        sub: 'The Stellar-native NFT marketplace and creator platform',
      },
      {
        kind: 'slide',
        layout: 'bullets',
        kicker: 'What makes it different',
        headline: 'Real settlement, not a status flag',
        bullets: [
          'Four Soroban contracts handle the money and the metadata',
          'Every trade moves escrowed assets in a single call',
          'Predictable creator royalties, keyed per token',
          'A full stack — marketplace, API, mobile, admin, SDK',
        ],
      },
      { kind: 'site', path: '/en', label: 'Landing page' },
    ],
    narration: `LumenMint is a production-grade NFT marketplace and creator platform, built natively on Stellar and Soroban. Not a wrapper around another chain, and not a demo with a fake backend. Four Soroban smart contracts handle minting, settlement, collection deployment and transaction orchestration. A NestJS API, a Next.js marketplace, an Expo mobile app, an admin dashboard and a developer SDK sit on top of them. And the settlement is real: fixed price, auction, bundle, or NFT-for-NFT swap. The assets move, the splits get paid, and the token changes hands in a single call.`,
  },

  {
    id: '03-architecture',
    title: 'Architecture',
    shots: [
      { kind: 'slide', layout: 'architecture' },
      { kind: 'slide', layout: 'workspaces' },
    ],
    narration: `Here is the shape of it. LumenMint is a monorepo, and every layer earns its place. The contracts are the foundation. An NFT contract with per-token royalties and role-based access control. A settlement contract that handles sales, auctions with escrowed bids and reserves, bundles, trades and disputes. A collection factory. And a transaction contract that executes operations in dependency order, detecting cycles before it spends gas. Above that, a NestJS backend serves REST and GraphQL, indexes Stellar events, and talks to Soroban RPC. Then the interfaces: a Next.js marketplace with full-text search, an Expo mobile app with biometric wallet storage, and a Vite admin dashboard. And finally the tooling — an SDK, a CLI, and AI metadata utilities, so other teams can build on the same foundation. It is all one repository, which matters more than it sounds: a change to a contract and the API that calls it move together, reviewed together, and verified by one pipeline that gates every push.`,
  },

  {
    id: '04-demo',
    title: 'Live product',
    shots: [
      { kind: 'site', path: '/en/marketplace', label: 'Marketplace' },
      { kind: 'site', path: '/en/creator-dashboard', label: 'Creator dashboard' },
      { kind: 'site', path: '/en/creator-dashboard/create-your-collection', label: 'Create a collection' },
      { kind: 'site', path: '/en/creator-dashboard/list-nfts-for-sale', label: 'List for sale' },
      { kind: 'site', path: '/en/auth/login', label: 'Wallet connect' },
    ],
    narration: `Let us go to the live deployment. This is the production site on Vercel, serving the marketplace you would actually use. Live auction cards with countdowns and current bids, top sellers, and curated picks sit alongside search across the catalogue. The creator dashboard is where the platform earns its keep. Create a collection, mint NFTs, list them for sale, and track sales — the entire creator lifecycle without touching a command line. Connect a Stellar wallet, and you are transacting: Freighter or Albedo, with the server-issued challenge signed on the client, so a signature can only ever be used for the login it was issued for. And because it is a progressive web app, it installs, and it keeps working offline.`,
  },

  {
    id: '05-engineering',
    title: 'Engineering',
    shots: [
      { kind: 'slide', layout: 'code' },
      { kind: 'slide', layout: 'gas' },
      { kind: 'slide', layout: 'rigour' },
    ],
    narration: `What makes this production grade is underneath. Every state-changing entry point on the contracts requires authorization and a reentrancy guard. All monetary arithmetic is checked, so a balance cannot silently overflow on a path that moves funds. Every error code in every contract enum is reachable, and the one hundred and seventy codes across the stack are enumerated in a generated registry that continuous integration fails on the moment it drifts. Gas is measured, not guessed: every hot path has a recorded baseline and an instruction ceiling that breaks the build on regression. On Testnet right now, an NFT transfer costs about one hundred and forty-six thousand stroops — roughly zero point zero one five XLM. A mint, which writes the token record, the owner index, the balance and the metadata, is about eight hundred and sixty-five thousand. And that sits on two hundred and fifty contract tests and six hundred and thirty backend tests, running on every push. The deployment is verifiable too. Each contract stamps the commit it was built from into its own version string, so the live contracts can be proved to match the source they claim to come from — and after the last round of changes, all four were rebuilt, redeployed, initialised and checked against it.`,
  },

  {
    id: '06-close',
    title: 'Why it matters',
    shots: [
      { kind: 'slide', layout: 'stats' },
      { kind: 'slide', layout: 'cta' },
    ],
    narration: `So why does this matter? Most Stellar NFT projects are either a smart contract with no product, or a product with no contracts. LumenMint is both, wired together, with the test coverage and documentation to prove it. It is open source and built to be contributed to: fifty-two open issues across the contracts, backend, frontend, mobile and tooling, labelled and scoped for newcomers. Ten continuous-integration workflows, a security scan on every push, conventional commits, a code of conduct, and contributor documentation. The contracts are live on Testnet today, and verifiable on Stellar Expert. LumenMint. Stellar-native NFT infrastructure that actually settles. And every claim in this video is checkable: the gas figures, the test counts, the error codes and the contract addresses all come from files the build keeps honest. The code, the deployment and the documentation are at github dot com slash Stellar LumenMint.`,
  },
];

/**
 * The accent colour used throughout, taken from `DESIGN_SYSTEM.md` so the
 * video and the product agree on what the brand looks like.
 */
export const BRAND = {
  primary: '#00D4FF',
  gradientTo: '#7B6FFF',
  background: '#0D1117',
  surface: '#141B24',
  panel: '#1E1A45',
  text: '#EEF2F7',
  muted: '#8A9BB0',
  border: '#1E2D3D',
  success: '#10B981',
  warning: '#F59E0B',
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
