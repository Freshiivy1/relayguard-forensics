// capture.ts — microphone capture-mode selection for in-browser recording.
//
// The forensic distinction: HANDSET mode asks the browser for the bottom
// "phone mic" with the call-style DSP chain (echo cancellation, noise
// suppression, auto-gain, Voice Isolation where available) — how a normal
// phone call sounds. SPEAKERPHONE mode asks for the raw far-mic path with
// all DSP off — how a speakerphone relay actually sounds.
//
// Browsers silently ignore constraints they don't support, so after
// getUserMedia resolves we read track.getSettings() and surface (and export)
// exactly what was granted — never claiming DSP that isn't active.

export type CaptureMode = 'handset' | 'speakerphone';

/** What the browser ACTUALLY granted, from MediaStreamTrack.getSettings(). */
export interface CaptureGranted {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  /** iOS 17+ Safari / recent Chrome; undefined on browsers without support. */
  voiceIsolation?: boolean;
  channelCount?: number;
  sampleRate?: number;
}

/** Per-recording capture metadata, threaded into the analysis export. */
export interface CaptureMeta {
  mode: CaptureMode;
  granted: CaptureGranted;
}

interface CaptureModeInfo {
  label: string;
  shortLabel: string;
  hint: string;
}

export const CAPTURE_MODES: Record<CaptureMode, CaptureModeInfo> = {
  handset: {
    label: 'HANDSET · PHONE MIC',
    shortLabel: 'Handset',
    hint: 'Bottom mic + call DSP (noise suppression, echo cancel, auto-gain) — like a normal phone call.',
  },
  speakerphone: {
    label: 'SPEAKERPHONE · FAR MIC',
    shortLabel: 'Speakerphone',
    hint: 'Raw far-mic capture, DSP off — how a speakerphone relay actually sounds.',
  },
};

/** getUserMedia audio constraints for a capture mode (mono in both cases). */
export function captureConstraints(mode: CaptureMode): MediaTrackConstraints {
  const dsp = mode === 'handset';
  // voiceIsolation is not yet in the TS DOM constraint types.
  return {
    echoCancellation: dsp,
    noiseSuppression: dsp,
    autoGainControl: dsp,
    voiceIsolation: dsp,
    channelCount: 1,
  } as unknown as MediaTrackConstraints;
}

/** Read the applied settings off a live audio track. */
export function readGrantedSettings(track: MediaStreamTrack): CaptureGranted {
  const s = track.getSettings() as MediaTrackSettings & { voiceIsolation?: boolean };
  return {
    echoCancellation: s.echoCancellation,
    noiseSuppression: s.noiseSuppression,
    autoGainControl: s.autoGainControl,
    voiceIsolation: s.voiceIsolation,
    channelCount: s.channelCount,
    sampleRate: s.sampleRate,
  };
}

/**
 * Honest chip readout for the granted DSP state. `requested` comes from the
 * selected capture mode; anything requested but undefined → 'unsupported',
 * requested but false → 'off'.
 */
export function grantedChips(
  mode: CaptureMode,
  granted: CaptureGranted,
): { label: string; ok: boolean }[] {
  const want = mode === 'handset';
  const rows: { key: 'echoCancellation' | 'noiseSuppression' | 'autoGainControl' | 'voiceIsolation'; tag: string }[] = [
    { key: 'echoCancellation', tag: 'EC' },
    { key: 'noiseSuppression', tag: 'NS' },
    { key: 'autoGainControl', tag: 'AGC' },
    { key: 'voiceIsolation', tag: 'VI' },
  ];
  const chips = rows.map(({ key, tag }) => {
    const v = granted[key];
    if (v === undefined) return { label: `${tag} unsupported`, ok: !want };
    if (v) return { label: `${tag} on`, ok: true };
    return { label: `${tag} off`, ok: !want };
  });
  if (granted.channelCount != null) chips.push({ label: `${granted.channelCount} ch`, ok: true });
  return chips;
}
