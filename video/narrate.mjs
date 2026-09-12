#!/usr/bin/env node
/**
 * Generates the voice-over, one file per scene.
 *
 * The audio is the clock: `assemble.mjs` reads the duration of each scene's
 * narration and builds that scene's visuals to match. That is why narration is
 * generated before assembly rather than in parallel with it — a scene whose
 * pictures outrun its voice is the single most obvious way a pitch video looks
 * amateur, and deriving duration from audio makes it impossible.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scenes } from './scenes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const AUDIO = join(HERE, 'audio');

/**
 * A warm, confident narrator. `AndrewMultilingualNeural` reads like a person
 * presenting rather than an announcement, which is the difference between a
 * pitch that holds attention and one that gets skipped.
 */
const VOICE = process.env.TTS_VOICE ?? 'en-US-AndrewMultilingualNeural';

/** Slightly quickened; default pace is a touch slow for a product pitch. */
const RATE = process.env.TTS_RATE ?? '+6%';
const PITCH = process.env.TTS_PITCH ?? '-2Hz';

function durationOf(file) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
    { encoding: 'utf8' },
  );
  return Number.parseFloat(out.trim());
}

function speak(scene) {
  const media = join(AUDIO, `${scene.id}.mp3`);

  execFileSync(
    'python3',
    [
      '-m', 'edge_tts',
      '--voice', VOICE,
      '--rate', RATE,
      '--pitch', PITCH,
      '--text', scene.narration,
      '--write-media', media,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  return { media };
}

function main() {
  rmSync(AUDIO, { recursive: true, force: true });
  mkdirSync(AUDIO, { recursive: true });

  const report = [];
  let total = 0;

  for (const scene of scenes) {
    process.stdout.write(`  narrating ${scene.id} … `);
    const { media } = speak(scene);

    const seconds = durationOf(media);
    total += seconds;

    // Leave a beat after each scene so the edit does not feel clipped.
    const holdSeconds = 0.9;

    report.push({
      id: scene.id,
      title: scene.title,
      audioSeconds: Number(seconds.toFixed(2)),
      holdSeconds,
      audio: `audio/${scene.id}.mp3`,
    });

    console.log(`${seconds.toFixed(1)}s`);
  }

  writeFileSync(join(HERE, 'narration.json'), JSON.stringify({ voice: VOICE, rate: RATE, scenes: report }, null, 2));

  const minutes = Math.floor(total / 60);
  const seconds = Math.round(total % 60);
  console.log(`\nTotal narration: ${minutes}m ${seconds}s (${total.toFixed(1)}s) across ${report.length} scenes.`);
}

main();
