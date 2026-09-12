#!/usr/bin/env node
/**
 * Captures every visual the pitch needs.
 *
 * Two sources, deliberately: slides rendered from the brand palette for the
 * narrative, and real screenshots of the live deployment for the product. A
 * pitch made only of slides is a deck; a pitch that shows the running product is
 * evidence, and judges can tell the difference.
 *
 * Output: `video/assets/*.png` plus `video/manifest.json`, which the assembler
 * reads so shot order and motion are defined in one place.
 */

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { scenes, FPS } from './scenes.mjs';
import { renderSlide } from './slides.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, 'assets');
const SITE = process.env.SITE_URL ?? 'https://stellar-lumenmint.vercel.app';

// Slides render at 2x so the slow push-in stays sharp when it is scaled back to
// 1080p. A 1x screenshot visibly softens the moment the motion starts.
const SLIDE_SCALE = 2;
const SITE_SCALE = 2;

/** Give the Next.js app time to hydrate, fetch and settle before shooting. */
const SETTLE_MS = 2600;

async function captureSlides(browser, shot, outFile) {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: SLIDE_SCALE,
  });

  await page.setContent(renderSlide(shot), { waitUntil: 'load' });
  // Inter must be resolved before the shot, or the first frame renders in a
  // fallback face and every later frame looks like a different product.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);

  await page.screenshot({ path: outFile });
  await page.close();
}

async function captureSite(browser, url, outFile) {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: SITE_SCALE,
  });

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });

  if (response && response.status() >= 400) {
    await page.close();
    return { ok: false, status: response.status() };
  }

  // `networkidle` is unreliable against an app that polls; wait for the shell
  // and then a fixed settle instead.
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(SETTLE_MS);

  // A page that renders an error state still screenshots perfectly, and a
  // broken screen in a product pitch is worse than a missing one. Check the
  // text before shooting and refuse anything that admits it failed.
  const text = await page.evaluate(() => document.body.innerText);
  const failure = /Failed to fetch|Auction Not Found|Something went wrong/i.exec(text);
  if (failure) {
    await page.close();
    return { ok: false, status: response?.status() ?? 200, reason: failure[0] };
  }

  await page.screenshot({ path: outFile, fullPage: true });
  const height = await page.evaluate(() => document.body.scrollHeight);
  await page.close();

  return { ok: true, status: response?.status() ?? 200, heightPx: height };
}

/**
 * Pages that are deliberately not captured.
 *
 * `/marketplace/auctions` and `/marketplace/auction/:id` are driven by the
 * backend API, and the deployed frontend has no API reachable (`lib/config.ts`
 * defaults to `http://localhost:9000`), so both render "Failed to fetch".
 * Filming a broken page in a product pitch would be dishonest, so they are
 * excluded instead — see issue #71. Removing an entry here is the last step of
 * that fix, because it means the route is worth filming again.
 */
const KNOWN_BROKEN = ['/marketplace/auctions', '/marketplace/auction/'];

async function main() {
  rmSync(ASSETS, { recursive: true, force: true });
  mkdirSync(ASSETS, { recursive: true });

  const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
  const manifest = { site: SITE, fps: FPS, scenes: [], warnings: [] };

  for (const scene of scenes) {
    const shots = [];

    for (const [index, shot] of scene.shots.entries()) {
      const file = join(ASSETS, `${scene.id}-${index}.png`);

      if (shot.kind === 'slide') {
        await captureSlides(browser, shot, file);
        shots.push({ file: `${scene.id}-${index}.png`, kind: 'slide', motion: 'zoom', label: shot.layout });
        console.log(`  slide  ${scene.id}-${index}  ${shot.layout}`);
        continue;
      }

      const path = shot.path;

      if (KNOWN_BROKEN.some((broken) => path.includes(broken))) {
        manifest.warnings.push(`${scene.id}: "${shot.label}" is a known-broken route and was skipped`);
        console.log(`  skip   ${scene.id}-${index}  ${shot.label} (known broken route)`);
        continue;
      }

      const url = path.startsWith('http') ? path : `${SITE}${path}`;
      const result = await captureSite(browser, url, file);

      if (!result.ok) {
        manifest.warnings.push(
          `${scene.id}: ${url} -> ${result.reason ?? `HTTP ${result.status}`}`,
        );
        console.log(`  fail   ${scene.id}-${index}  ${url} -> ${result.reason ?? result.status}`);
        continue;
      }

      shots.push({
        file: `${scene.id}-${index}.png`,
        kind: 'site',
        // A page taller than the frame gets scrolled; a short one gets a slow
        // push so a static screen still reads as a shot rather than a freeze.
        motion: result.heightPx > 1200 ? 'scroll' : 'zoom',
        label: shot.label,
        url,
        heightPx: result.heightPx,
      });
      console.log(`  site   ${scene.id}-${index}  ${shot.label}  (${result.heightPx}px, ${result.heightPx > 1200 ? 'scroll' : 'zoom'})`);
    }

    if (shots.length === 0) {
      manifest.warnings.push(`${scene.id}: no shots captured; scene will be omitted`);
    }

    manifest.scenes.push({
      id: scene.id,
      title: scene.title,
      narration: scene.narration,
      shots,
      audio: `audio/${scene.id}.mp3`,
    });
  }

  await browser.close();
  writeFileSync(join(HERE, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const total = manifest.scenes.reduce((n, s) => n + s.shots.length, 0);
  console.log(`\nCaptured ${total} shots across ${manifest.scenes.length} scenes.`);
  if (manifest.warnings.length) {
    console.log('\nWarnings:');
    for (const w of manifest.warnings) console.log(`  - ${w}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
