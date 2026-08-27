// decode.ts — decode any audio File/Blob to mono Float32Array at 16 kHz.

export const TARGET_SR = 16000;

export interface DecodedAudio {
  /** mono samples at TARGET_SR */
  samples: Float32Array;
  sampleRate: number;
  /** duration in seconds (at TARGET_SR) */
  duration: number;
  /** original decoded sample rate (before resample) */
  originalSampleRate: number;
}

let sharedCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

/** Mix an AudioBuffer down to a single Float32Array. */
function mixToMono(buf: AudioBuffer): Float32Array {
  const n = buf.length;
  const out = new Float32Array(n);
  const chans = buf.numberOfChannels;
  for (let c = 0; c < chans; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += d[i] / chans;
  }
  return out;
}

/** Windowed-sinc (Lanczos-3 style) resampler. Falls back to linear for speed on huge ratios. */
export function resample(input: Float32Array, fromSr: number, toSr: number): Float32Array {
  if (fromSr === toSr) return input.slice();
  const ratio = fromSr / toSr;
  const outLen = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLen);
  // Lanczos kernel half-width in input samples (kept small for speed; plenty at audio rates)
  const a = ratio > 1 ? Math.ceil(ratio) * 3 : 3;

  const sinc = (x: number) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
  const lanczos = (x: number) =>
    Math.abs(x) >= a ? 0 : sinc(x) * sinc(x / a);

  // Pre-lowpass width when downsampling: stretch kernel by ratio to band-limit.
  const width = ratio > 1 ? a : a; // same half-width; kernel scaled below
  const scale = ratio > 1 ? 1 / ratio : 1;

  for (let i = 0; i < outLen; i++) {
    const center = i * ratio;
    const lo = Math.max(0, Math.floor(center - width / scale));
    const hi = Math.min(input.length - 1, Math.ceil(center + width / scale));
    let sum = 0;
    let wsum = 0;
    for (let j = lo; j <= hi; j++) {
      const w = lanczos((j - center) * scale);
      sum += input[j] * w;
      wsum += w;
    }
    out[i] = wsum !== 0 ? sum / wsum : 0;
  }
  return out;
}

/** Peak-normalize to -1..1 with a small headroom. */
export function normalizePeak(samples: Float32Array, peak = 0.98): Float32Array {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > max) max = v;
  }
  if (max < 1e-8) return samples;
  const g = peak / max;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * g;
  return out;
}

/** Decode a File/Blob into mono 16 kHz samples. Throws on decode failure. */
export async function decodeAudio(blob: Blob): Promise<DecodedAudio> {
  const ctx = getContext();
  const arr = await blob.arrayBuffer();
  const buf = await ctx.decodeAudioData(arr);
  const mono = mixToMono(buf);
  const resampled = resample(mono, buf.sampleRate, TARGET_SR);
  return {
    samples: resampled,
    sampleRate: TARGET_SR,
    duration: resampled.length / TARGET_SR,
    originalSampleRate: buf.sampleRate,
  };
}

/** Decode raw mono samples (e.g. from MediaRecorder pcm is not available, so this is for demos). */
export function fromSamples(samples: Float32Array, sampleRate: number): DecodedAudio {
  const resampled = resample(samples, sampleRate, TARGET_SR);
  return {
    samples: resampled,
    sampleRate: TARGET_SR,
    duration: resampled.length / TARGET_SR,
    originalSampleRate: sampleRate,
  };
}
