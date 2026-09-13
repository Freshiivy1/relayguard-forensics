# Live-call validation — status

**There is no live gate/bridge in this repository, and there are no live call recordings or traces.**

RelayGuard as shipped (v1–v7) is a 100% client-side, file/record-based A/B tool. A live VoIP module
(real-time gate/bridge injecting the challenge probe into a call at 30% and analysing return audio with zero
added latency) was requested at one point, but the requirement was immediately narrowed to delivering the
challenge-noise audio file itself, so the bridge was never designed or built. This document records that
explicitly so no one goes looking for code that does not exist.

## What exists today

- The deterministic challenge probe (`src/lib/audio/probe.ts`), with standalone renders at 30%/70%/100%
  (`challenge-noise-*.wav/mp3`).
- The offline A/B analysis pipeline (record or upload A and B in the browser; full DSP runs locally).
- Mic-mode capture (`src/lib/audio/capture.ts`): handset vs speakerphone mode with granted-DSP readout
  (echoCancellation / noiseSuppression / autoGainControl / voiceIsolation) — the building block a live
  bridge would reuse.
- Evidence-pack export: every analysis exports both clips (original + normalized MP3) plus all features and
  scores as JSON, which is the trace format a live deployment should also emit per call.

## What a live bridge would require (not built)

1. A media gateway in the call path (e.g. SIP/RTP B2BUA or WebRTC SFU plugin) that:
   - plays the probe into the far-end leg at calibrated level on suspicion,
   - taps the return audio for probe recurrence + channel cues in real time.
2. Streaming versions of `probe.ts` recurrence detection and the channel layer (windowed, low-latency;
   the current pipeline is whole-clip, offline).
3. Per-call traces: probe seed/level, injected-at timestamps, return-recurrence scores, channel features,
   voice-panel outputs — matching the offline evidence-pack schema.
4. Validation recordings: paired handset/speakerphone calls through the bridge, labelled at capture time.

If live validation is needed, the shortest honest path is: capture recordings through the real VoIP system
with the probe played manually at 30%, label them, and run them through the offline pipeline — the scoring
rules in `docs/EVALUATION.md` apply unchanged. The streaming gate can then be validated against those traces.
