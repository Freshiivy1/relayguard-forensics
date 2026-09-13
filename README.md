# RelayGuard — A/B Call Comparison · Second-Hop Relay Forensics

RelayGuard is a **100% client-side** audio forensics web app that decides whether a suspect
audio clip (Audio B) shows the fingerprint of a **second-hop speakerphone relay** — call audio
played over a speakerphone and re-captured by another phone — compared against a reference
clip (Audio A). All analysis runs in the browser; audio never leaves the page.

## What it does

- **A/B comparison workflow** — drop, browse, or record two clips; pick the expected channel
  baseline (Good wideband / Okay normal phone / Poor prison phone); both clips are normalized
  to the baseline before comparison.
- **Mic capture modes (recording)** — choose `HANDSET · PHONE MIC` (bottom mic + call-style
  on-device DSP: echo cancellation, noise suppression, auto-gain, Voice Isolation on iOS 17+)
  or `SPEAKERPHONE · FAR MIC` (raw capture, DSP off). The UI shows which DSP features were
  actually granted by the browser, and the granted settings are included in exports.
- **Active probe** — optionally plays a calibrated, deterministic, bass-free shaped noise
  (seed `0x5eed`, 500 Hz–6 kHz band, +4 dB presence at 2 kHz) while recording, then measures
  how the probe spectrum was transformed (probe-band smear, response fidelity). Pre-rendered
  probe audio lives in `docs/` releases; generate programmatically via `generateProbe()`.
- **Verdict + confidence** — `MATCH`, `SUSPICIOUS RELAY`, or `UNCERTAIN`, from a weighted
  multi-signal vote:
  - **Voice panel (5 corpus-calibrated biometric matchers)** — MFCC+deltas, Fisher
    discriminant (trained between/within-speaker weights), LPC-root formant signature,
    pitch/F0, long-term spectrum shape. ≥3/5 consensus with zero opposing votes decides;
    a SAME consensus overrides quality flags, a DIFFERENT consensus **vetoes MATCH**.
  - **Channel thinness** — band-energy fingerprint vs per-baseline margins.
  - **Spectral integrity flags** — strict `BASS_DEPLETED` / `SPEECH_THIN` flags with a
    MATCH-blocking veto (unless a voice-same consensus overrides).
  - **Relay fingerprint** — spectral smear, gap–burst contrast, noise-bed margin.
  - **Envelope, spectral smear, conversation cues**, plus duty-cycle gating in noise.
- **Scientific evidence** — channel-normalized waveforms, 0–4 kHz spectrograms with
  telephone-band edges and low-band flag overlays, A−B speech-spectrum difference strip,
  band-energy fingerprint chart, per-signal evidence accordion.
- **Playback & export** — per-clip original/normalized players, MP3 download, full analysis
  JSON and evidence-pack (JSON + embedded base64 MP3s) export with ground-truth labels for
  training data collection.

## Voice-panel calibration

Matchers are logistic-calibrated on 33 male voices (32 VoxForge speakers selected by measured
F0 + one field sample), mixed clean/relay conditions. Held-out results: 0.8% false-same rate
(clean), 0.0% (relay); same-voice consensus stays conservative under heavy degradation.
Calibration constants ship in `src/lib/audio/voiceCalibration.ts`; training data and metrics
in `docs/voice-calibration.json`, fixture audio in `docs/test-fixtures/`.

## Tech stack

Vite 7 · React 19 + TypeScript · Tailwind CSS v3.4 · shadcn/ui · Canvas 2D visualizers ·
pure-TypeScript DSP (STFT/MFCC/LPC/VAD — no server, no runtime ML downloads).

## Development

```bash
npm install
npm run dev    # local dev server
npm run build  # production build (tsc + vite)
```

## Disclaimer

Verdicts are forensic cues, not proof. RelayGuard is not a speaker-identification product and
must not be used as the sole basis for consequential decisions.
