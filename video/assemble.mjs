#!/usr/bin/env node
/**
 * Renders the final pitch video.
 *
 * Design decisions worth knowing before changing anything here:
 *
 *  * **The narration is the clock.** Each scene's pictures are sized to its
 *    audio, so the voice and the visuals cannot drift. Shot durations are
 *    derived, never typed in.
 *  * **Scenes are assembled independently, then concatenated.** Inside a scene
 *    the shots crossfade; between scenes there is a short dip to black. That
 *    keeps each scene's audio starting at its own zero, which is what makes
 *    exact sync possible — a global crossfade would shift every later scene's
 *    soundtrack by the overlap.
 *  * **Motion is per-shot, not per-scene.** A tall page scrolls, because a
 *    still screenshot of a scrolled page reads as a photo; a full-frame slide
 *    pushes in slowly, so it does not look frozen.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS, WIDTH, HEIGHT } from './scenes.mjs';
import { XFADE, sceneTiming } from './timing.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORK = join(HERE, '.work');
const OUT = join(HERE, 'out');
const FONT = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf';

/** Fade from/to black at each scene boundary. Render-only. */
const SCENE_FADE = 0.4;

function run(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

function durationOf(file) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
    { encoding: 'utf8' },
  );
  return Number.parseFloat(out.trim());
}

function dimensionsOf(file) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file],
    { encoding: 'utf8' },
  );
  const [width, height] = out.trim().split(',').map(Number);
  return { width, height };
}

/**
 * Normalise any source image to a 16:9 frame before motion is applied.
 *
 * A full-page screenshot is taller than it is wide and a slide is exactly 16:9.
 * `zoompan` scales its input to the output size without preserving aspect, so
 * without this a tall page would arrive visibly squashed. `increase` then
 * `crop` fills the frame and trims the excess rather than distorting it.
 */
const TO_FRAME = `scale=${WIDTH * 2}:${HEIGHT * 2}:force_original_aspect_ratio=increase,crop=${WIDTH * 2}:${HEIGHT * 2}`;

/** Slow push-in, centred. `on` is the output frame index, so zoom is time-based. */
function zoomFilter(seconds) {
  const step = 0.16 / (seconds * FPS);
  return `zoompan=z='min(1.0+${step.toFixed(6)}*on,1.16)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${WIDTH}x${HEIGHT}:fps=${FPS}`;
}

/** Vertical scroll across a page taller than the frame, eased at both ends. */
function scrollFilter(seconds) {
  const travel = 1;
  // Ease in/out so the scroll starts and stops gently instead of snapping.
  const eased = `(t/${seconds.toFixed(3)})*${travel}-${travel}*(sin(PI*min(t/${seconds.toFixed(3)},1)))/PI`;
  return [
    `crop=${WIDTH * 2}:${HEIGHT * 2}:0:'min((ih-${HEIGHT * 2})*max(0,min(${eased},1)),ih-${HEIGHT * 2})'`,
    `scale=${WIDTH}:${HEIGHT}`,
  ].join(',');
}

/** Build one shot as a clip of exactly `seconds`. */
function buildShot(shot, seconds, index, label) {
  const src = join(HERE, 'assets', shot.file);
  const dst = join(WORK, `shot-${String(index).padStart(2, '0')}.mp4`);

  const cols = existsSync(src) ? dimensionsOf(src) : null;
  if (!cols) throw new Error(`missing asset: ${src}`);

  const canScroll = cols.height > HEIGHT * 2 * 1.02;

  const chain = [];
  chain.push(TO_FRAME);
  chain.push(shot.motion === 'scroll' && canScroll ? scrollFilter(seconds) : zoomFilter(seconds));
  chain.push(`fps=${FPS}`);

  // Label the real product screenshots so a viewer always knows which surface
  // they are looking at; slides already carry their own heading.
  if (shot.kind === 'site' && label) {
    const safe = label.replace(/([:'\\])/g, '\\$1');
    chain.push(
      `drawtext=fontfile=${FONT}:text='${safe}':x=64:y=h-92:fontsize=30:` +
        `fontcolor=white@0.96:box=1:boxcolor=0x0D1117@0.72:boxborderw=18:borderw=0`,
    );
  }

  chain.push('format=yuv420p');

  run([
    '-loop', '1',
    '-framerate', String(FPS),
    '-i', src,
    '-t', seconds.toFixed(3),
    '-vf', chain.join(','),
    '-r', String(FPS),
    '-c:v', 'libx264',
    // These intermediates are re-encoded by the scene pass, so encode them fast
    // and near-losslessly rather than slowly and well: on a 2-core box the
    // ultrafast preset roughly halves total render time for no visible loss.
    '-preset', 'ultrafast',
    '-crf', '16',
    '-pix_fmt', 'yuv420p',
    '-an',
    dst,
  ]);

  return dst;
}

function buildScene(scene, narration, index) {
  const shots = scene.shots;

  if (shots.length === 0) {
    throw new Error(`scene ${scene.id} has no shots`);
  }

  const { durations } = sceneTiming(shots.length, narration.audioSeconds);

  const clips = shots.map((shot, i) =>
    buildShot(shot, durations[i], `${index}-${i}`.replace(/[^0-9-]/g, ''), shot.label),
  );

  const sceneFile = join(WORK, `scene-${String(index).padStart(2, '0')}.mp4`);

  // Chain the shots with crossfades, computing each offset from the accumulated
  // duration so the arithmetic stays correct for any number of shots.
  const inputs = clips.flatMap((clip) => ['-i', clip]);
  const filters = [];
  let accumulated = durations[0];
  let last = '[0:v]';

  for (let i = 1; i < clips.length; i += 1) {
    const offset = Math.max(accumulated - XFADE, 0);
    const out = `[x${i}]`;
    filters.push(
      `${last}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}${out}`,
    );
    accumulated = accumulated + durations[i] - XFADE;
    last = out;
  }

  // Then the audio, the scene fades and the captions, in that order, so the
  // captions sit above the faded picture rather than being faded themselves.
  const audioIndex = clips.length;
  const subtitlePath = join(HERE, narration.subs);
  const hasSubs = existsSync(subtitlePath);
  const subtitleEscaped = subtitlePath.replace(/([:'\\])/g, '\\$1');

  const post = [
    `fade=t=in:st=0:d=${SCENE_FADE}`,
    `fade=t=out:st=${Math.max(accumulated - SCENE_FADE, 0).toFixed(3)}:d=${SCENE_FADE}`,
  ];
  if (hasSubs) {
    // Burned in via libass, using the brand font, so the video is followable
    // with the sound off.
    post.push(
      `subtitles='${subtitleEscaped}':force_style='FontName=Inter,FontSize=17,` +
        `PrimaryColour=&H00F7F2EE,OutlineColour=&H00101010,BorderStyle=3,Outline=1,Shadow=0,` +
        `MarginV=54,Alignment=2'`,
    );
  }

  // The label is followed directly by the filter chain — a comma here would
  // read as an empty filter name and ffmpeg rejects the whole graph.
  filters.push(`${last}${post.join(',')}[vout]`);

  run([
    ...inputs,
    '-i', join(HERE, narration.audio),
    '-filter_complex', filters.join(';'),
    '-map', '[vout]',
    '-map', `${audioIndex}:a`,
    // The video is fractionally longer than the audio; pad the audio with
    // silence so the scene does not end on a hard cut mid-sentence.
    '-af', `apad=whole_dur=${accumulated.toFixed(3)}`,
    '-t', accumulated.toFixed(3),
    '-r', String(FPS),
    '-c:v', 'libx264',
    // The scene pass re-encodes clips that were already encoded at CRF 19, so a
    // slower preset buys very little here and roughly triples the render time.
    '-preset', 'veryfast',
    '-crf', '19',
    '-profile:v', 'high',
    '-level', '4.0',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-movflags', '+faststart',
    sceneFile,
  ]);

  return { file: sceneFile, seconds: durationOf(sceneFile) };
}

function main() {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  // Three sources, each authoritative for one thing: the manifest knows which
  // images were actually captured and how each should move, the narration knows
  // how long each scene must last, and the scene definitions are already baked
  // into both by this point. Building from any one alone would fail — scene
  // definitions carry no filenames.
  const manifest = JSON.parse(readFileSync(join(HERE, 'manifest.json'), 'utf8'));
  const narration = JSON.parse(readFileSync(join(HERE, 'narration.json'), 'utf8'));
  const narrationById = new Map(narration.scenes.map((s) => [s.id, s]));

  const built = [];
  for (const [index, scene] of manifest.scenes.entries()) {
    const entry = narrationById.get(scene.id);

    if (!entry) {
      throw new Error(`no narration recorded for scene ${scene.id}; run narrate.mjs first`);
    }
    if (!scene.shots?.length) {
      throw new Error(`scene ${scene.id} has no captured shots; run capture.mjs first`);
    }

    const result = buildScene(scene, entry, index);
    built.push(result);
    console.log(
      `  scene ${index + 1}/${manifest.scenes.length}  ${scene.id.padEnd(16)} ${result.seconds.toFixed(1)}s`,
    );
  }

  // Concatenate. Scene fades mean the joins are dips to black, and because each
  // scene was rendered to its own narration length the audio stays in sync.
  const listFile = join(WORK, 'scenes.txt');
  writeFileSync(listFile, built.map((b) => `file '${b.file}'`).join('\n') + '\n');

  const finalFile = join(OUT, 'stellar-lumenmint-pitch.mp4');
  run([
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-c', 'copy',
    '-movflags', '+faststart',
    finalFile,
  ]);

  const seconds = durationOf(finalFile);
  const minutes = Math.floor(seconds / 60);
  const size = execFileSync('du', ['-h', finalFile], { encoding: 'utf8' }).split('\t')[0];

  console.log(`\n${finalFile}`);
  console.log(`  duration ${minutes}m ${Math.round(seconds % 60)}s   size ${size}`);

  const probe = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate:format=duration', '-of', 'default=nw=1', finalFile],
    { encoding: 'utf8' },
  );
  console.log(probe.trim().split('\n').map((l) => `  ${l}`).join('\n'));
}

main();
