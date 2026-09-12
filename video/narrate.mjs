#!/usr/bin/env node
/**
 * Generates the voice-over, one file per scene, plus word-timed subtitles.
 *
 * The audio is the clock: `assemble.mjs` reads the duration of each scene's
 * narration and builds that scene's visuals to match. That is why narration is
 * generated before assembly rather than in parallel with it — a scene whose
 * pictures outrun its voice is the single most obvious way a pitch video looks
 * amateur, and deriving duration from audio makes it impossible.
 *
 * Subtitles are captured at the same time because the TTS engine emits word
 * boundaries for free. Burning them in makes the video followable with the sound
 * off, which is how a large share of judges and reviewers will watch it.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
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

/**
 * Read the subtitle file back and return how many cues it holds.
 *
 * Used as a sanity check only: a zero-cue subtitle file means the engine
 * returned no word boundaries and burning it in would silently produce a video
 * with no captions, which is worse than knowing it up front.
 */
function cueCount(file) {
  if (!existsSync(file)) return 0;
  return readFileSync(file, 'utf8').split('\n').filter((l) => /^\d\d:\d\d:\d\d,\d+ --> /.test(l)).length;
}

function speak(scene) {
  const media = join(AUDIO, `${scene.id}.mp3`);
  // `.srt`, not `.vtt`: the engine emits comma-separated timings, which is SRT.
  // Handing that to ffmpeg with a WebVTT extension makes the subtitles filter
  // reject the file and silently produce a video with no captions at all.
  const subs = join(AUDIO, `${scene.id}.srt`);

  execFileSync(
    'python3',
    [
      '-m', 'edge_tts',
      '--voice', VOICE,
      '--rate', RATE,
      '--pitch', PITCH,
      '--text', scene.narration,
      '--write-media', media,
      '--write-subtitles', subs,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  return { media, subs };
}

function main() {
  rmSync(AUDIO, { recursive: true, force: true });
  mkdirSync(AUDIO, { recursive: true });

  const report = [];
  let total = 0;

  for (const scene of scenes) {
    process.stdout.write(`  narrating ${scene.id} … `);
    const { media, subs } = speak(scene);

    const seconds = durationOf(media);
    total += seconds;

    // Leave a beat after each scene so the edit does not feel clipped.
    const holdSeconds = 0.9;

    report.push({
      id: scene.id,
      title: scene.title,
      audioSeconds: Number(seconds.toFixed(2)),
      holdSeconds,
      cues: cueCount(subs),
      audio: `audio/${scene.id}.mp3`,
      subs: `audio/${scene.id}.srt`,
    });

    console.log(`${seconds.toFixed(1)}s, ${cueCount(subs)} cues`);
  }

  writeFileSync(join(HERE, 'narration.json'), JSON.stringify({ voice: VOICE, rate: RATE, scenes: report }, null, 2));

  const minutes = Math.floor(total / 60);
  const seconds = Math.round(total % 60);
  console.log(`\nTotal narration: ${minutes}m ${seconds}s (${total.toFixed(1)}s) across ${report.length} scenes.`);

  const silent = report.filter((r) => r.cues === 0);
  if (silent.length) {
    console.log(`\nWarning: no word boundaries for: ${silent.map((s) => s.id).join(', ')}`);
  }
}

main();
