/**
 * Scene timing, shared by the renderer and the transcript generator.
 *
 * These live in one place because two things depend on them and they must agree:
 * `assemble.mjs` decides how long each scene's pictures last, and
 * `transcript.mjs` reports the timestamp each chapter starts at. If the two
 * computed durations independently they would drift, and the transcript would
 * quietly point readers at the wrong moment in the video.
 */

/** Crossfade between shots inside a scene. */
export const XFADE = 0.6;

/** Beat held after the narration ends, so the edit does not feel clipped. */
export const HOLD = 0.9;

/** Shortest a shot may be; below this the motion is not perceptible. */
export const MIN_SHOT = 2.6;

/**
 * Split a scene's duration across its shots.
 *
 * Overlap is compensated rather than ignored: crossfades consume time, so the
 * shots must sum to the target *plus* the overlap or every scene would end up
 * shorter than its narration and the last words would be cut off.
 */
export function allocate(shotCount, targetSeconds) {
  const total = targetSeconds + (shotCount - 1) * XFADE;
  let each = total / shotCount;

  if (each < MIN_SHOT) each = MIN_SHOT;

  return new Array(shotCount).fill(each);
}

/**
 * Resolve one scene into its per-shot durations and its rendered length.
 *
 * The rendered length is the shots summed minus the time the crossfades
 * consume — which is exactly the arithmetic `assemble.mjs` performs while
 * chaining the clips, stated once.
 */
export function sceneTiming(shotCount, narrationSeconds) {
  const durations = allocate(shotCount, narrationSeconds + HOLD);
  const seconds = durations.reduce((n, d) => n + d, 0) - (shotCount - 1) * XFADE;

  return { durations, seconds };
}
