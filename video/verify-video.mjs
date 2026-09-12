#!/usr/bin/env node
/**
 * Verifies the committed video artifacts.
 *
 * The pitch is the first thing a judge, investor or recruiter sees, and it is
 * linked from the README of every other document in the repository. A broken
 * link or a truncated render is a silent failure — the README still renders, the
 * player still opens, and the video is simply wrong or missing. This checks the
 * things that cannot be eyeballed in review:
 *
 *   1. the video exists, decodes, and matches the format the README promises;
 *   2. its runtime agrees with the narration it was built from, so a stale
 *      render cannot ship under a current thumbnail;
 *   3. the thumbnail exists at the expected resolution;
 *   4. every repository link the READMEs point at the video actually resolves.
 *
 * Exits non-zero on any failure, so it is safe to run in CI.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const VIDEO = join(HERE, 'out', 'stellar-lumenmint-pitch.mp4');
const THUMB = join(HERE, 'out', 'thumbnail.png');
const TRANSCRIPT = join(HERE, 'out', 'TRANSCRIPT.md');

/** Runtime must be a five-minute pitch; anything outside this is a bad render. */
const MIN_SECONDS = 270;
const MAX_SECONDS = 360;
/** GitHub warns on files over 50 MB and this is committed to history. */
const MAX_BYTES = 45 * 1024 * 1024;

const failures = [];
const checks = [];

function check(label, ok, detail) {
  checks.push({ label, ok, detail });
  if (!ok) failures.push(`${label}: ${detail}`);
}

function probe(args, file) {
  return execFileSync('ffprobe', ['-v', 'error', ...args, file], { encoding: 'utf8' }).trim();
}

/**
 * Read the stream list as JSON.
 *
 * Deliberately not `csv`: ffprobe emits fields in its own internal order rather
 * than the order they are requested, so a positional parse silently reads
 * `codec_name` where it expects `codec_type` and reports every stream as
 * missing. Named fields remove the ordering assumption entirely.
 */
function streamsOf(file) {
  return JSON.parse(
    probe(['-show_entries', 'stream=codec_type,codec_name,width,height', '-of', 'json'], file),
  ).streams;
}

function pngSize(file) {
  // A PNG stores width/height in the IHDR chunk: bytes 16-24, big-endian.
  const buf = readFileSync(file).subarray(0, 24);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function main() {
  // Fail with something readable rather than an ENOENT stack trace a few frames
  // deep in `spawnSync`. `ffprobe` is the one external tool this needs.
  try {
    execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error(
      'ffprobe is not installed.\n\n' +
        'It ships with ffmpeg:\n' +
        '  macOS   brew install ffmpeg\n' +
        '  Debian  sudo apt-get install -y ffmpeg\n',
    );
    process.exit(1);
  }

  // ── The video ────────────────────────────────────────────────────────────
  check('video exists', existsSync(VIDEO), `${VIDEO} is missing; run npm run assemble`);

  if (existsSync(VIDEO)) {
    const bytes = statSync(VIDEO).size;
    check(
      'video size is commit-safe',
      bytes < MAX_BYTES,
      `${(bytes / 1048576).toFixed(1)} MB exceeds the ${MAX_BYTES / 1048576} MB budget`,
    );

    const streams = streamsOf(VIDEO);
    const video = streams.find((s) => s.codec_type === 'video');
    const audio = streams.find((s) => s.codec_type === 'audio');

    check('video stream present', Boolean(video), 'no video stream');
    check('audio stream present', Boolean(audio), 'no audio stream');
    check('h264 video', video?.codec_name === 'h264', `expected h264, got "${video?.codec_name}"`);
    check(
      '1080p frame',
      video?.width === 1920 && video?.height === 1080,
      `expected 1920x1080, got ${video?.width}x${video?.height}`,
    );
    check('aac audio', audio?.codec_name === 'aac', `expected aac, got "${audio?.codec_name}"`);

    const duration = Number.parseFloat(probe(['-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1'], VIDEO));
    check(
      'runtime in range',
      duration >= MIN_SECONDS && duration <= MAX_SECONDS,
      `${duration.toFixed(1)}s is outside ${MIN_SECONDS}-${MAX_SECONDS}s`,
    );

    // The narration manifest is only present after a local `npm run narrate`; if
    // it is there, the render must agree with it or one of the two is stale.
    const narrationPath = join(HERE, 'narration.json');
    if (existsSync(narrationPath)) {
      const { scenes } = JSON.parse(readFileSync(narrationPath, 'utf8'));
      const expected = scenes.reduce((n, s) => n + s.audioSeconds + s.holdSeconds, 0);
      // Crossfade compensation and per-scene rounding move this by a few
      // seconds; anything larger means the video was built from a different
      // script than the one on disk.
      check(
        'runtime matches the narration on disk',
        Math.abs(duration - expected) < 8,
        `video is ${duration.toFixed(1)}s but the narration totals ${expected.toFixed(1)}s`,
      );
    }
  }

  // ── The thumbnail ────────────────────────────────────────────────────────
  check('thumbnail exists', existsSync(THUMB), `${THUMB} is missing; run npm run thumbnail`);

  if (existsSync(THUMB)) {
    const { width, height } = pngSize(THUMB);
    // Rendered at 2x for high-DPI displays.
    check('thumbnail is 2x 720p', width === 2560 && height === 1440, `got ${width}x${height}`);
  }

  // ── The transcript ───────────────────────────────────────────────────────
  check(
    'transcript exists',
    existsSync(TRANSCRIPT),
    `${TRANSCRIPT} is missing; run npm run transcript`,
  );

  if (existsSync(TRANSCRIPT)) {
    const text = readFileSync(TRANSCRIPT, 'utf8');
    const chapters = [...text.matchAll(/^## \[(\d+:\d\d)\]/gm)].length;
    check('transcript has every chapter', chapters === 6, `found ${chapters} chapter headings`);

    // A transcript that does not mention the deployment it is pitching to is a
    // sign it was generated from a stale script.
    check(
      'transcript matches the current script',
      text.includes('LumenMint. Stellar-native NFT infrastructure that actually settles.'),
      'the closing narration in TRANSCRIPT.md does not match scenes.mjs',
    );
  }

  // ── The links every README uses to reach the video ───────────────────────
  const readmes = [
    join(REPO, 'README.md'),
    join(HERE, 'README.md'),
  ].filter(existsSync);

  // Only relative links are resolvable from a checkout; absolute URLs are the
  // link checker's job, not ours.
  const RELATIVE = /\]\((\.[^)]+\.(?:mp4|png|md))\)/g;
  const broken = [];
  let total = 0;
  let videoLinks = 0;

  for (const readme of readmes) {
    const name = readme.slice(REPO.length + 1);
    for (const [, link] of readFileSync(readme, 'utf8').matchAll(RELATIVE)) {
      total += 1;
      if (/\.(mp4|png)$/.test(link)) videoLinks += 1;
      if (!existsSync(join(dirname(readme), link))) broken.push(`${name} -> ${link}`);
    }
  }

  // Reported as a single check: one line per link buries the real signal in
  // noise when a README has dozens of them.
  check(
    `relative links resolve (${total})`,
    broken.length === 0,
    `broken:\n    ${broken.join('\n    ')}`,
  );

  check(
    'README links directly to the video',
    videoLinks > 0,
    'no relative .mp4 or .png link found; the video is unreachable from the README',
  );

  // ── Report ───────────────────────────────────────────────────────────────
  for (const { label, ok, detail } of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `  — ${detail}`}`);
  }

  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${checks.length} checks passed.`);
}

main();
