// export.ts — client-side encoders (WAV 16-bit PCM, MP3 via lamejs) and the
// analysis / evidence-pack JSON builders. Everything stays in the browser.
import { Mp3Encoder } from '@breezystack/lamejs';
import { BASELINES, type BaselineMode } from './channel';
import { VOTE_SAME_AT, VOTE_DIFFERENT_AT } from './voiceCalibration';
import type { ComparisonResult } from './compare';
import type { ClipProfile } from './features';
import type { ProbeMeta } from './probe';
import type { ScanCell } from './render';

export type GroundTruth = 'direct_call' | 'speakerphone_relay' | 'unknown';

export const GROUND_TRUTH_OPTIONS: { id: GroundTruth; label: string }[] = [
  { id: 'direct_call', label: 'Direct call' },
  { id: 'speakerphone_relay', label: 'Speakerphone relay' },
  { id: 'unknown', label: 'Unknown' },
];

export interface ClipExportMeta {
  name: string;
  duration: number;
  originalSampleRate: number;
  source: 'file' | 'demo' | 'recording';
  /** challenge-noise metadata, present only on clips recorded with the probe */
  probe?: ProbeMeta;
}

/** Plain-JSON probe metadata (snake_case) for clip exports. */
function serializeProbeMeta(probe: ProbeMeta | undefined) {
  if (!probe) return null;
  return {
    on: probe.on,
    seed: probe.seed,
    level: probe.level,
    band_hz: [probe.band[0], probe.band[1]],
  };
}

// ------------------------------------------------------------------ PCM ----

/** Float32 (-1..1) → 16-bit signed PCM. */
export function floatTo16BitPCM(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

/** Encode mono PCM as a 16-bit WAV blob. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const pcm = floatTo16BitPCM(samples);
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  v.setUint32(16, 16, true); // PCM chunk size
  v.setUint16(20, 1, true); // PCM format
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  v.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  return new Blob([buf], { type: 'audio/wav' });
}

/** Encode mono PCM as an MP3 blob (lamejs, 16 kHz mono). */
export function encodeMp3(samples: Float32Array, sampleRate: number, kbps = 64): Blob {
  const pcm = floatTo16BitPCM(samples);
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const chunks: Uint8Array[] = [];
  const block = 1152; // lamejs frame size
  for (let i = 0; i < pcm.length; i += block) {
    const part = encoder.encodeBuffer(pcm.subarray(i, Math.min(i + block, pcm.length)));
    if (part.length > 0) chunks.push(part);
  }
  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(tail);
  return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
}

// ---------------------------------------------------------------- helpers --

/** Trigger a browser download for a blob. */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Blob → base64 (no data: prefix). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('base64 read failed'));
    reader.onload = () => {
      const s = String(reader.result);
      resolve(s.slice(s.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/** Human-readable size, e.g. "1.9 MB". */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** File-name-safe timestamp: 2025-01-31T14-05-09. */
export function fileStamp(d = new Date()): string {
  return d.toISOString().slice(0, 19).replace(/:/g, '-');
}

// -------------------------------------------------------- JSON serializers --

function num(v: number): number | null {
  return Number.isFinite(v) ? v : null;
}

/**
 * Plain-JSON version of a ClipProfile: drops the raw spectrogram power matrix
 * (huge, recomputable from the embedded audio) but keeps its shape metadata,
 * the VAD summary + turns, and the long-term mean spectrum.
 */
export function serializeProfile(p: ClipProfile) {
  return {
    sample_rate: p.sampleRate,
    duration_s: num(p.duration),
    spectrogram: {
      frames: p.spec.frames,
      bins: p.spec.bins,
      fft_size: p.spec.fftSize,
      hop: p.spec.hop,
    },
    vad: {
      duty_cycle: num(p.vad.dutyCycle),
      burst_count: p.vad.burstCount,
      burst_cv: num(p.vad.burstCV),
      gap_depth_db: num(p.vad.gapDepthDb),
      dynamic_range_db: num(p.vad.dynamicRangeDb),
      noise_floor_db: num(p.vad.noiseFloorDb),
      threshold_db: num(p.vad.thresholdDb),
      turns: p.vad.turns,
    },
    bands: { ...p.bands },
    centroid_hz: num(p.centroidHz),
    p95_hz: num(p.p95Hz),
    p99_hz: num(p.p99Hz),
    thinness: num(p.thinness),
    burst_flatness: num(p.burstFlatness),
    flatness_all: num(p.flatnessAll),
    probe_band_flatness: num(p.probeBandFlatness),
    gap_vs_burst_db: num(p.gapVsBurstDb),
    speech_to_bed_db: num(p.noise.speechToBedDb),
    probe_fidelity: p.probe?.on ? num(p.probe.fidelity) : null,
    speech: {
      frames: p.speech.frames,
      low_band_80_300: num(p.speech.lowBand),
      low_inband_300_500: num(p.speech.lowInband),
      centroid_hz: num(p.speech.centroidHz),
      p95_hz: num(p.speech.p95Hz),
    },
    probe: p.probe
      ? {
          on: p.probe.on,
          seed: p.probe.seed,
          level: p.probe.level,
          band_hz: [p.probe.band[0], p.probe.band[1]],
          probe_band_flatness: num(p.probe.bandFlatness),
          fidelity: num(p.probe.fidelity),
          fidelity_state: p.probe.fidelityState,
        }
      : null,
    noise_bed: { ...p.noise },
    f0: { ...p.f0 },
    mean_spectrum: Array.from(p.meanSpectrum, (v) => Number(v.toExponential(5))),
  };
}

export interface AnalysisExportInput {
  result: ComparisonResult;
  baseline: BaselineMode;
  sampleRate: number;
  metaA: ClipExportMeta;
  metaB: ClipExportMeta;
  /** feature profiles of the unprocessed clips */
  rawProfileA: ClipProfile;
  rawProfileB: ClipProfile;
  groundTruth: GroundTruth | null;
  scan: { cells: ScanCell[]; duration: number } | null;
  exportedAt?: Date;
}

/** The complete structured analysis result (no audio embedded). */
export function buildAnalysisObject(input: AnalysisExportInput) {
  const { result: r } = input;
  const base = BASELINES[input.baseline];
  const clip = (
    role: 'reference' | 'comparison',
    meta: ClipExportMeta,
    original: ClipProfile,
    normalized: ClipProfile,
  ) => ({
    role,
    name: meta.name,
    source: meta.source,
    duration_s: num(meta.duration),
    original_sample_rate: meta.originalSampleRate,
    sample_rate: input.sampleRate,
    probe: serializeProbeMeta(meta.probe),
    features: {
      original: serializeProfile(original),
      normalized: serializeProfile(normalized),
    },
  });
  return {
    app: 'relayguard',
    kind: 'analysis',
    schema: 1,
    exported_at: (input.exportedAt ?? new Date()).toISOString(),
    analysis_timestamp: r.timestampIso,
    ground_truth: input.groundTruth,
    baseline: {
      mode: base.mode,
      label: base.label,
      band_hz: base.band,
      thinness_margin: base.margin,
    },
    clips: {
      a: clip('reference', input.metaA, input.rawProfileA, r.a),
      b: clip('comparison', input.metaB, input.rawProfileB, r.b),
    },
    signals: {
      voice: r.voice,
      voice_panel: {
        matchers: r.voicePanel.matchers.map((m) => ({
          id: m.id,
          name: m.name,
          raw: num(m.raw),
          p: num(m.p),
          logistic: { a: m.logistic.a, b: m.logistic.b },
          verdict: m.verdict,
          detail: m.detail,
        })),
        same_count: r.voicePanel.sameCount,
        different_count: r.voicePanel.differentCount,
        abstain_count: r.voicePanel.abstainCount,
        voters: r.voicePanel.voters,
        agree_count: r.voicePanel.agreeCount,
        consensus: r.voicePanel.consensus,
        override_engaged: r.voicePanel.overrideEngaged,
        veto_engaged: r.voicePanel.vetoEngaged,
        rule: r.voicePanel.rule,
        thresholds: { same_at: VOTE_SAME_AT, different_at: VOTE_DIFFERENT_AT, min_frames: 10 },
      },
      channel: r.channel,
      spectral_integrity: {
        available: r.spectralIntegrity.available,
        frames_a: r.spectralIntegrity.framesA,
        frames_b: r.spectralIntegrity.framesB,
        min_speech_frames: r.spectralIntegrity.minSpeechFrames,
        band_hz: r.spectralIntegrity.bandHz,
        low_band_a: num(r.spectralIntegrity.lowBandA),
        low_band_b: num(r.spectralIntegrity.lowBandB),
        low_band_rel_drop: num(r.spectralIntegrity.lowBandRelDrop),
        low_band_abs_drop: num(r.spectralIntegrity.lowBandAbsDrop),
        centroid_a_hz: num(r.spectralIntegrity.centroidA),
        centroid_b_hz: num(r.spectralIntegrity.centroidB),
        centroid_rel_drop: num(r.spectralIntegrity.centroidRelDrop),
        p95_a_hz: num(r.spectralIntegrity.p95A),
        p95_b_hz: num(r.spectralIntegrity.p95B),
        p95_rel_drop: num(r.spectralIntegrity.p95RelDrop),
        bass_depleted: r.spectralIntegrity.bassDepleted,
        speech_thin: r.spectralIntegrity.speechThin,
        flags: r.spectralIntegrity.flags,
        thresholds: {
          bass_rel_drop: 0.35,
          bass_abs_drop: 0.005,
          bass_floor: 0.004,
          p95_rel_drop: 0.12,
          centroid_rel_drop: 0.15,
          weight: 0.75,
        },
        detail: r.spectralIntegrity.detail,
      },
      relay: r.relay,
      envelope: { ...r.envelope, duty_gated: r.envelope.dutyGated },
      spectral_smear: r.spectralSmear,
      noise_bed: r.noiseBed,
      probe: r.probe.active
        ? {
            active: true,
            a: r.probe.a,
            b: r.probe.b,
          }
        : { active: false, a: null, b: null },
      conversation: r.conversation,
    },
    votes: r.votes,
    weighted_score: r.weightedScore,
    max_weighted_score: r.maxWeightedScore,
    relay_votes: r.relayVotes,
    total_votes: r.totalVotes,
    verdict: r.verdict,
    confidence: r.confidence,
    reduced_confidence: r.reducedConfidence,
    flags: r.flags,
    flag_vetoed: r.flagVetoed,
    flag_override: r.flagOverride,
    voice_veto: r.voiceVeto,
    explanation: r.explanation,
    scan: input.scan,
  };
}

export type AnalysisObject = ReturnType<typeof buildAnalysisObject>;

/** Evidence pack = analysis JSON + both clips as base64 MP3 (original + normalized). */
export function attachAudio(
  analysis: AnalysisObject,
  audio: {
    aOriginalMp3: string;
    aNormalizedMp3: string;
    bOriginalMp3: string;
    bNormalizedMp3: string;
  },
) {
  return {
    ...analysis,
    kind: 'evidence-pack',
    clips: {
      a: {
        ...analysis.clips.a,
        audio: {
          encoding: 'mp3/base64',
          original: audio.aOriginalMp3,
          normalized: audio.aNormalizedMp3,
        },
      },
      b: {
        ...analysis.clips.b,
        audio: {
          encoding: 'mp3/base64',
          original: audio.bOriginalMp3,
          normalized: audio.bNormalizedMp3,
        },
      },
    },
  };
}
