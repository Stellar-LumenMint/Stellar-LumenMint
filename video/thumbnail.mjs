#!/usr/bin/env node
/**
 * Renders the pitch video's thumbnail.
 *
 * The thumbnail carries the whole burden of getting the video watched: on GitHub
 * it is the only thing a reader sees, so it has to read at small sizes. That
 * rules out a scaled-down frame from the video — 1080p type is unreadable once
 * it is drawn at 1280 wide in a README — so this is a purpose-built composition
 * at a fixed 1280x720 with a play affordance drawn in.
 *
 * Output: `video/out/thumbnail.png`, referenced by the README.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { BRAND } from './scenes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const OUT = join(HERE, 'out');

const WIDTH = 1280;
const HEIGHT = 720;

/**
 * Playwright resolves `file://` URLs but not bare paths, and the logo has to be
 * inlined rather than linked because a relative `background-image` would need a
 * base URL to resolve against `setContent`.
 */
const LOGO = readFileSync(
  join(REPO, 'frontend', 'public', 'stellar-lumenmint-logo-dark.svg'),
  'utf8',
).replace(/\s(width|height)="[^"]*"/g, '');

/** Matches the rendered video; asserted against the file by verify-video.mjs. */
const DURATION = '5:15';

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: ${BRAND.background};
    color: ${BRAND.text};
    -webkit-font-smoothing: antialiased;
  }

  .stage { position: relative; width: ${WIDTH}px; height: ${HEIGHT}px; }

  .glow {
    position: absolute; inset: 0;
    background:
      radial-gradient(680px 460px at 8% -10%, rgba(0,212,255,.26), transparent 62%),
      radial-gradient(660px 480px at 100% 112%, rgba(123,111,255,.26), transparent 60%);
  }
  .grid {
    position: absolute; inset: 0; opacity: .28;
    background-image:
      linear-gradient(rgba(30,45,61,.45) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30,45,61,.45) 1px, transparent 1px);
    background-size: 52px 52px;
    mask-image: radial-gradient(circle at 50% 40%, #000 0%, transparent 80%);
  }

  .frame {
    position: absolute; inset: 26px;
    border: 1px solid ${BRAND.border}; border-radius: 20px;
  }

  .inner {
    position: absolute; inset: 0;
    padding: 62px 68px;
    display: flex; flex-direction: column; justify-content: space-between;
  }

  .logo { height: 34px; opacity: .95; }

  .kicker {
    font-size: 15px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase;
    background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.gradientTo});
    -webkit-background-clip: text; background-clip: text; color: transparent;
    margin-bottom: 18px;
  }

  h1 { font-size: 66px; line-height: 1.08; font-weight: 800; letter-spacing: -.025em; }
  h1 .grad {
    background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.gradientTo});
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }

  .sub { color: ${BRAND.muted}; font-size: 21px; margin-top: 16px; letter-spacing: .01em; }

  .playrow { display: flex; align-items: center; gap: 22px; }

  .play {
    flex: none; width: 92px; height: 92px; border-radius: 999px;
    background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.gradientTo});
    display: grid; place-items: center;
    box-shadow: 0 0 0 10px rgba(0,212,255,.09), 0 18px 44px rgba(0,0,0,.55);
  }
  .play svg { width: 34px; height: 34px; margin-left: 7px; }

  .meta { display: flex; flex-direction: column; gap: 7px; }
  .meta .t { font-size: 27px; font-weight: 700; letter-spacing: -.01em; }
  .meta .d { color: ${BRAND.muted}; font-size: 18px; letter-spacing: .05em; }

  .pills { position: absolute; right: 68px; bottom: 74px; display: flex; gap: 10px; }
  .pill {
    font-size: 14px; font-weight: 650; letter-spacing: .04em;
    border: 1px solid ${BRAND.border}; border-radius: 999px; padding: 9px 17px;
    color: ${BRAND.muted}; background: rgba(20,27,36,.75);
  }
</style></head>
<body>
  <div class="stage">
    <div class="glow"></div>
    <div class="grid"></div>
    <div class="frame"></div>

    <div class="inner">
      <div class="logo">${LOGO}</div>

      <div>
        <div class="kicker">Product pitch</div>
        <h1><span class="grad">Stellar-native NFT</span><br>infrastructure that settles.</h1>
        <div class="sub">Marketplace · Auctions · Creator tools — live on Stellar Testnet</div>
      </div>

      <div class="playrow">
        <div class="play">
          <svg viewBox="0 0 24 24" fill="#04121A"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <div class="meta">
          <div class="t">Watch the 5-minute pitch</div>
          <div class="d">${DURATION} · Captioned · Full transcript included</div>
        </div>
      </div>
    </div>

    <div class="pills">
      <div class="pill">4 Soroban contracts</div>
      <div class="pill">250 contract tests</div>
      <div class="pill">Live on Vercel</div>
    </div>
  </div>
</body></html>`;

async function main() {
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    // Render at 2x so the README thumbnail stays crisp on high-DPI displays and
    // so the same file can be used as a video poster without looking soft.
    deviceScaleFactor: 2,
  });

  await page.setContent(HTML, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);

  const file = join(OUT, 'thumbnail.png');
  await page.screenshot({ path: file });
  await browser.close();

  console.log(`  thumbnail  ${file}  ${WIDTH}x${HEIGHT} @2x`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
