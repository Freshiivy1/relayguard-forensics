// player.ts — a single shared AudioContext player for 16 kHz mono PCM clips.
// Exactly one logical clip ("key") plays at a time; starting a new key stops
// the previous one. UI components subscribe to state snapshots.

export interface PlayerState {
  /** id of the clip currently loaded into the player (null when idle) */
  key: string | null;
  playing: boolean;
  /** playhead position in seconds */
  positionSec: number;
  /** total duration in seconds (0 when idle) */
  durationSec: number;
}

interface ActiveClip {
  key: string;
  buffer: AudioBuffer;
  durationSec: number;
}

let ctx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let active: ActiveClip | null = null;
let playing = false;
/** seconds into the buffer when the current source was started */
let startOffset = 0;
/** ctx.currentTime when the current source was started */
let startedAt = 0;
let ticker: number | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function subscribePlayer(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function ensureCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function stopTicker(): void {
  if (ticker !== null) {
    window.clearInterval(ticker);
    ticker = null;
  }
}

function startTicker(): void {
  stopTicker();
  // ~10 Hz is plenty for a thin progress bar; keeps re-renders cheap.
  ticker = window.setInterval(() => {
    const c = ctx;
    if (!playing || !active || !c) return;
    if (c.currentTime - startedAt + startOffset >= active.durationSec) {
      // safety net in case onended was swallowed
      finish();
      return;
    }
    emit();
  }, 100);
}

function stopSource(): void {
  if (source) {
    source.onended = null;
    try {
      source.stop();
    } catch {
      // already stopped
    }
    try {
      source.disconnect();
    } catch {
      // not connected
    }
    source = null;
  }
}

function finish(): void {
  stopSource();
  playing = false;
  startOffset = 0;
  stopTicker();
  emit();
}

function currentPosition(): number {
  if (!active) return 0;
  if (playing && ctx) {
    return Math.min(active.durationSec, Math.max(0, startOffset + ctx.currentTime - startedAt));
  }
  return Math.min(active.durationSec, Math.max(0, startOffset));
}

export function getPlayerState(): PlayerState {
  return {
    key: active?.key ?? null,
    playing,
    positionSec: currentPosition(),
    durationSec: active?.durationSec ?? 0,
  };
}

function startSource(offsetSec: number): void {
  if (!active) return;
  const c = ensureCtx();
  stopSource();
  const src = c.createBufferSource();
  src.buffer = active.buffer;
  src.connect(c.destination);
  src.onended = () => {
    if (playing) finish();
  };
  startOffset = Math.min(active.durationSec, Math.max(0, offsetSec));
  startedAt = c.currentTime;
  playing = true;
  src.start(0, startOffset);
  startTicker();
  emit();
}

/**
 * Load `samples` under `key` and start playing at `offsetSec`.
 * Any other clip stops. If `key` matches the loaded clip, the existing
 * buffer is reused (cheap seek-resume).
 */
export function playPcm(key: string, samples: Float32Array, sampleRate: number, offsetSec = 0): void {
  const c = ensureCtx();
  if (!active || active.key !== key || active.buffer.length !== samples.length) {
    stopSource();
    const buffer = c.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    active = { key, buffer, durationSec: samples.length / sampleRate };
  }
  startSource(offsetSec);
}

/** Pause the current clip (position is kept). */
export function pausePcm(): void {
  if (!playing || !active) return;
  startOffset = currentPosition();
  stopSource();
  playing = false;
  stopTicker();
  emit();
}

/** Resume the paused clip. */
export function resumePcm(): void {
  if (!active || playing) return;
  startSource(startOffset);
}

/** Move the playhead (works while playing or paused). */
export function seekPcm(sec: number): void {
  if (!active) return;
  if (playing) startSource(sec);
  else {
    startOffset = Math.min(active.durationSec, Math.max(0, sec));
    emit();
  }
}

/** Stop everything and unload the clip. */
export function stopAll(): void {
  stopSource();
  active = null;
  playing = false;
  startOffset = 0;
  stopTicker();
  emit();
}
