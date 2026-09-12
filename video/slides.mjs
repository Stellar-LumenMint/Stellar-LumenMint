import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND, WIDTH, HEIGHT } from './scenes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

/**
 * Pull a real excerpt out of the repository so the code on screen is the code
 * that ships. A hand-typed snippet is the fastest way to end up with a pitch
 * that no longer compiles against the thing it is pitching.
 */
function readSnippet(relPath, from, to) {
  const lines = readFileSync(join(REPO, relPath), 'utf8').split('\n');
  return lines.slice(from - 1, to).join('\n');
}

/** The logo, inlined so the render has no external dependency. */
const LOGO = readFileSync(
  join(REPO, 'frontend', 'public', 'stellar-lumenmint-logo-dark.svg'),
  'utf8',
)
  // The asset ships with its own width/height; let CSS decide instead.
  .replace(/\s(width|height)="[^"]*"/g, '');

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --primary: ${BRAND.primary};
    --gradient-to: ${BRAND.gradientTo};
    --bg: ${BRAND.background};
    --surface: ${BRAND.surface};
    --panel: ${BRAND.panel};
    --text: ${BRAND.text};
    --muted: ${BRAND.muted};
    --border: ${BRAND.border};
    --success: ${BRAND.success};
    --warning: ${BRAND.warning};
  }

  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'ss01';
    -webkit-font-smoothing: antialiased;
  }

  .stage { position: relative; width: ${WIDTH}px; height: ${HEIGHT}px; padding: 84px 104px; display: flex; flex-direction: column; }

  /* Ambient background: a brand glow plus a faint grid for depth. */
  .glow {
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(900px 620px at 12% -8%, rgba(0,212,255,.20), transparent 62%),
      radial-gradient(880px 640px at 96% 108%, rgba(123,111,255,.20), transparent 60%);
  }
  .grid {
    position: absolute; inset: 0; pointer-events: none; opacity: .30;
    background-image:
      linear-gradient(rgba(30,45,61,.42) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30,45,61,.42) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: radial-gradient(circle at 50% 42%, #000 0%, transparent 78%);
  }

  .topbar { position: relative; display: flex; align-items: center; justify-content: space-between; margin-bottom: 46px; }
  .logo { height: 40px; opacity: .95; }
  .chapter {
    font-size: 15px; letter-spacing: .20em; text-transform: uppercase;
    color: var(--muted); font-weight: 600;
  }

  .body { position: relative; flex: 1; display: flex; flex-direction: column; justify-content: center; }

  .kicker {
    font-size: 19px; font-weight: 700; letter-spacing: .20em; text-transform: uppercase;
    background: linear-gradient(135deg, var(--primary), var(--gradient-to));
    -webkit-background-clip: text; background-clip: text; color: transparent;
    margin-bottom: 26px;
  }

  h1 { font-size: 84px; line-height: 1.06; font-weight: 800; letter-spacing: -.025em; }
  h1 .grad {
    background: linear-gradient(135deg, var(--primary), var(--gradient-to));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  h2 { font-size: 62px; line-height: 1.1; font-weight: 800; letter-spacing: -.02em; }

  .sub { font-size: 30px; color: var(--muted); margin-top: 28px; line-height: 1.45; font-weight: 450; }

  .footer {
    position: relative; display: flex; align-items: center; gap: 18px;
    margin-top: 44px; padding-top: 24px; border-top: 1px solid var(--border);
    color: var(--muted); font-size: 17px; letter-spacing: .04em;
  }
  .dot { width: 9px; height: 9px; border-radius: 99px; background: var(--success); box-shadow: 0 0 14px var(--success); }

  .card {
    background: linear-gradient(180deg, rgba(20,27,36,.92), rgba(20,27,36,.62));
    border: 1px solid var(--border); border-radius: 22px;
  }

  .bullets { display: flex; flex-direction: column; gap: 22px; margin-top: 44px; }
  .bullet { display: flex; align-items: flex-start; gap: 20px; font-size: 30px; color: var(--text); line-height: 1.4; }
  .tick {
    flex: none; width: 38px; height: 38px; border-radius: 99px; margin-top: 4px;
    display: grid; place-items: center; font-size: 20px; font-weight: 800; color: #04121A;
    background: linear-gradient(135deg, var(--primary), var(--gradient-to));
  }

  pre.code {
    font-family: 'DejaVu Sans Mono', ui-monospace, monospace;
    font-size: 21px; line-height: 1.62; color: #C9D6E4;
    background: #0A0E14; border: 1px solid var(--border); border-radius: 20px;
    padding: 34px 38px; overflow: hidden; white-space: pre;
  }
  .code .cm { color: #5C7085; font-style: italic; }
  .code .kw { color: #FF7AB6; }
  .code .ty { color: #7EE7FF; }
  .code .fn { color: #B9A6FF; }
  .code .st { color: #8FE388; }
  .filename {
    display: inline-flex; align-items: center; gap: 12px; color: var(--muted);
    font-size: 17px; font-family: 'DejaVu Sans Mono', monospace;
    border: 1px solid var(--border); border-radius: 10px 10px 0 0;
    border-bottom: 0; padding: 12px 22px; background: #0A0E14;
  }
  .filename .swatch { width: 9px; height: 9px; border-radius: 99px; }

  table.gas { width: 100%; border-collapse: collapse; font-size: 24px; }
  table.gas th {
    text-align: left; color: var(--muted); font-size: 17px; letter-spacing: .14em;
    text-transform: uppercase; font-weight: 700; padding: 0 0 16px;
    border-bottom: 1px solid var(--border);
  }
  table.gas td { padding: 17px 0; border-bottom: 1px solid rgba(30,45,61,.6); }
  table.gas td.num, table.gas th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'DejaVu Sans Mono', monospace; }
  table.gas tr:last-child td { border-bottom: 0; }
  .mono { font-family: 'DejaVu Sans Mono', monospace; }

  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px; margin-top: 52px; }
  .stat { padding: 34px 30px; }
  .stat .v {
    font-size: 66px; font-weight: 800; letter-spacing: -.03em; line-height: 1;
    background: linear-gradient(135deg, var(--primary), var(--gradient-to));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .stat .k { color: var(--muted); font-size: 20px; margin-top: 16px; line-height: 1.35; }

  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 46px; }
  .grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 26px; margin-top: 46px; }
  .fact { padding: 30px 32px; }
  .fact .t { font-size: 25px; font-weight: 700; margin-bottom: 14px; }
  .fact .d { color: var(--muted); font-size: 21px; line-height: 1.45; }
  .fact .badge {
    display: inline-block; font-size: 15px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; padding: 6px 13px; border-radius: 99px; margin-bottom: 18px;
    color: var(--primary); border: 1px solid rgba(0,212,255,.35); background: rgba(0,212,255,.08);
  }

  .layer {
    display: flex; align-items: center; justify-content: space-between; gap: 26px;
    padding: 21px 30px; border-radius: 16px; border: 1px solid var(--border);
    background: linear-gradient(90deg, rgba(20,27,36,.95), rgba(20,27,36,.55));
    margin-bottom: 13px;
  }
  .layer .l { font-size: 25px; font-weight: 650; }
  .layer .r { color: var(--muted); font-size: 20px; font-family: 'DejaVu Sans Mono', monospace; }
  .layer.accent { border-color: rgba(0,212,255,.45); background: linear-gradient(90deg, rgba(0,212,255,.13), rgba(123,111,255,.06)); }
  .arrowdown { text-align: center; color: var(--border); font-size: 20px; margin: -4px 0 9px; }
`;

/** Wrap layout markup in the shared shell. */
function shell({ chapter, inner }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head>
<body>
  <div class="stage">
    <div class="glow"></div>
    <div class="grid"></div>
    <div class="topbar">
      <div class="logo">${LOGO}</div>
      <div class="chapter">${chapter ?? ''}</div>
    </div>
    <div class="body">${inner}</div>
  </div>
</body></html>`;
}

function stat(v, k) {
  return `<div class="card stat"><div class="v">${v}</div><div class="k">${k}</div></div>`;
}

function fact(badge, title, desc) {
  return `<div class="card fact">${badge ? `<div class="badge">${badge}</div>` : ''}
    <div class="t">${title}</div><div class="d">${desc}</div></div>`;
}

const LAYOUTS = {
  statement: (s) => shell({
    chapter: s.kicker,
    inner: `
      <h1>${s.headline.replace(/\n/g, '<br>')}</h1>
      ${s.sub ? `<div class="sub">${s.sub}</div>` : ''}`,
  }),

  title: (s) => shell({
    chapter: '',
    inner: `
      <div style="text-align:center">
        <div class="kicker" style="margin-bottom:34px">${s.kicker ?? ''}</div>
        <h1 style="font-size:120px"><span class="grad">${s.headline}</span></h1>
        <div class="sub" style="font-size:34px">${s.sub}</div>
      </div>`,
  }),

  bullets: (s) => shell({
    chapter: s.kicker,
    inner: `
      <h2>${s.headline}</h2>
      <div class="bullets">
        ${s.bullets.map((b) => `<div class="bullet"><div class="tick">✓</div><div>${b}</div></div>`).join('')}
      </div>`,
  }),

  architecture: () => shell({
    chapter: 'Architecture',
    inner: `
      <h2 style="margin-bottom:40px">One monorepo, four contracts</h2>
      <div>
        <div class="layer"><div class="l">Interfaces</div><div class="r">Next.js · Expo · Vite admin</div></div>
        <div class="arrowdown">▲</div>
        <div class="layer"><div class="l">Backend API</div><div class="r">NestJS · REST + GraphQL · Soroban RPC</div></div>
        <div class="arrowdown">▲</div>
        <div class="layer accent"><div class="l">Soroban contracts</div><div class="r">NFT · Settlement · Factory · Transactions</div></div>
        <div class="arrowdown">▲</div>
        <div class="layer"><div class="l">Stellar</div><div class="r">Testnet · XLM Stellar Asset Contract</div></div>
      </div>`,
  }),

  workspaces: () => shell({
    chapter: 'Architecture',
    inner: `
      <h2 style="margin-bottom:6px">Six workspaces, one release</h2>
      <div class="grid3">
        ${fact('Rust', 'Contracts', 'Settlement, NFTs, auctions, royalties — 250 tests')}
        ${fact('NestJS', 'Backend', 'REST + GraphQL, event indexer, 630 tests')}
        ${fact('Next.js', 'Marketplace', 'Search, auctions, PWA, i18n in four locales')}
        ${fact('Expo', 'Mobile', 'iOS and Android, biometric wallet storage')}
        ${fact('Vite', 'Admin', 'Moderation and on-chain configuration')}
        ${fact('TypeScript', 'SDK / CLI / AI', 'So other teams build on the same foundation')}
      </div>`,
  }),

  code: () => shell({
    chapter: 'Engineering',
    inner: `
      <h2 style="margin-bottom:34px; font-size:52px">Settlement you can audit</h2>
      <div>
        <div class="filename"><span class="swatch" style="background:${BRAND.primary}"></span>soroban/contracts/marketplace_settlement/src/settlement_core.rs</div>
        <pre class="code">${highlight(
          readSnippet(
            'soroban/contracts/marketplace_settlement/src/settlement_core.rs',
            479,
            521,
          ),
        )}</pre>
      </div>`,
  }),

  gas: () => shell({
    chapter: 'Engineering',
    inner: `
      <h2 style="margin-bottom:8px">Gas is measured, not guessed</h2>
      <div class="sub" style="margin-top:14px; font-size:25px; margin-bottom:30px">
        Testnet fees for the two operations that matter most, with an instruction
        ceiling on every hot path that fails the build on regression.
      </div>
      <table class="gas">
        <thead><tr><th>Operation</th><th class="num">CPU</th><th class="num">Ledger writes</th><th class="num">Testnet fee</th></tr></thead>
        <tbody>
          <tr><td>NFT transfer</td><td class="num">348,978</td><td class="num">6</td><td class="num" style="color:${BRAND.success}">~146,000 stroops</td></tr>
          <tr><td>Mint</td><td class="num">333,578</td><td class="num">5</td><td class="num" style="color:${BRAND.success}">~865,000 stroops</td></tr>
          <tr><td>Execute sale</td><td class="num">856,370</td><td class="num">6</td><td class="num" style="color:${BRAND.muted}">split paid in one call</td></tr>
          <tr><td>Auction end</td><td class="num">592,238</td><td class="num">5</td><td class="num" style="color:${BRAND.muted}">royalty + fee + proceeds</td></tr>
        </tbody>
      </table>`,
  }),

  rigour: () => shell({
    chapter: 'Engineering',
    inner: `
      <h2 style="margin-bottom:6px">Production-grade, and checkable</h2>
      <div class="grid2">
        ${fact('Contracts', 'Authorization and reentrancy on every entry point', 'Every state-changing call requires auth and passes through a guard.')}
        ${fact('Arithmetic', 'Checked, never wrapping', 'Monetary maths goes through checked helpers; distributions must sum exactly.')}
        ${fact('Error codes', '170 codes, generated registry', 'CI fails the moment the registry drifts from the enums.')}
        ${fact('Reliability', 'Every code reachable', 'Contract enums audited so no condition is misreported.')}
      </div>`,
  }),

  stats: () => shell({
    chapter: 'Open source',
    inner: `
      <h2 style="margin-bottom:4px">Built to be contributed to</h2>
      <div class="stats">
        ${stat('250', 'Contract tests across four contracts')}
        ${stat('630', 'Backend tests, on every push')}
        ${stat('10', 'CI workflows, incl. security scan')}
        ${stat('52', 'Open issues, scoped and labelled')}
      </div>
      <div class="sub" style="font-size:24px; margin-top:34px">
        Conventional commits · code of conduct · contributor docs · generated documentation
      </div>`,
  }),

  cta: () => shell({
    chapter: '',
    inner: `
      <div style="text-align:center">
        <h1 style="font-size:104px"><span class="grad">Stellar-native NFT<br>infrastructure.</span></h1>
        <div class="sub" style="font-size:34px; margin-top:32px">
          Live on Testnet · verifiable on Stellar Expert
        </div>
        <div style="margin-top:56px; display:inline-flex; align-items:center; gap:18px;
                    border:1px solid var(--border); border-radius:99px; padding:22px 42px;
                    background:linear-gradient(180deg, rgba(20,27,36,.95), rgba(20,27,36,.6))">
          <span class="mono" style="font-size:30px; color:var(--primary)">github.com/Stellar-LumenMint</span>
        </div>
      </div>`,
  }),
};

/**
 * Minimal Rust highlighter.
 *
 * A syntax-highlighting library would be a heavier dependency than the pitch
 * needs, and escaping has to happen regardless — so this tokenises once, on the
 * already-escaped text, and colours a small set of constructs.
 */
function highlight(code) {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    // Comments first, so a keyword inside one is not highlighted.
    .replace(/(\/\/[^\n]*)/g, '<span class="cm">$1</span>')
    .split('\n')
    .map((line) =>
      line.includes('class="cm"')
        ? line
        : line
            .replace(/\b(pub|fn|let|mut|if|return|Err|Ok|Some|None|match|impl|struct|use)\b/g, '<span class="kw">$1</span>')
            .replace(/\b(Env|Address|Result|i128|u64|Vec|String|bool|Option)\b/g, '<span class="ty">$1</span>')
            .replace(/"([^"]*)"/g, '<span class="st">"$1"</span>'),
    )
    .join('\n');
}

export function renderSlide(shot, index) {
  const fn = LAYOUTS[shot.layout];
  if (!fn) throw new Error(`unknown slide layout: ${shot.layout}`);
  return fn(shot, index);
}
