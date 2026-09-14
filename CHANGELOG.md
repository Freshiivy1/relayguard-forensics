# Changelog

## v7.0.1 — MATCH certainty gate + literal 3/5 same-rule (2026-09-14)
- Ground-truth audit harness (headless engine over 48 labelled pairs)
- compare.ts: MATCH now requires a ≥3/5 same-voice panel consensus; a no_consensus panel downgrades MATCH to UNCERTAIN
  (fixes 5/37 = 13.5% false-MATCH leak on clean different-voice pairs → 0/37)
- voice.ts: same-consensus = ≥3 same votes with same > different (user's literal 3/5 rule); different-consensus kept strict
- Measured after fix: panel false-SAME 0/37, end-to-end false MATCH 0/37, same-voice panel SAME 5/8

## v7.0.1 — MATCH certainty gate + literal 3/5 same-rule (2026-09-14)
- Ground-truth audit harness (headless engine over 48 labelled pairs): results in `docs/labelled-examples/` terms
- compare.ts: MATCH now requires a ≥3/5 same-voice panel consensus; a no_consensus panel downgrades MATCH to UNCERTAIN
  (fixes 5/37 = 13.5% false-MATCH leak on clean different-voice pairs → 0/37)
- voice.ts: same-consensus = ≥3 same votes with same > different (user's literal 3/5 rule); different-consensus kept strict
- Measured after fix: panel false-SAME 0/37, end-to-end false MATCH 0/37, same-voice panel SAME 5/8

Git tags start at v7.0.0. The GitHub repo was seeded with squashed commits, so earlier versions are
identified here by their commit hashes in the original history (recorded below). From v7.0.0 onward,
`package.json` `version` and git tags are authoritative.

## v7.0.0 — handset/speakerphone mic capture modes (commit 7b28c7d, delivery 97c1951)
- CaptureMode handset/speakerphone with constraint sets and granted-DSP readout
- Docs: README, design, voice-calibration.json, test fixtures
- This release adds: labelled examples with original audio, EVALUATION.md, LIVE-VALIDATION.md

## v6.0.0 — corpus-calibrated voice panel (commit 5d2fe1e)
- 5 matchers calibrated on 32 VoxForge males + owner voice (33 speakers)
- Logistic per-matcher calibration, 0.60/0.40 votes, ≥3/0 consensus
- DIFFERENT consensus vetoes MATCH; SAME consensus overrides quality flags
- Held-out: false-same 0.8% clean / 0% relay; user-vs-32-males 0 false SAME

## v5.0.0 — 5-system voice biometric panel (commit 6f80f41)
- mfcc_v2, fisher, formant (polynomial-root LPC), f0, ltas

## v4.0.0 — strict thin-audio / bass-depleted flagging (commit e85fae6)
- BASS_DEPLETED + thin-spectrum flags with spectrogram evidence

## v3.0.0 — challenge-noise probe (commit ccd9f55)
- Seeded probe playback during B recording, probe-recurrence scoring, margins 0.03/0.05/0.08

## v2.0.0 — playback, MP3 download, evidence-pack export (commit 4ce6859)
- In-app playback, lamejs MP3 export, evidence-pack JSON with embedded audio

## v1.0.0 — initial build (commit c11cb88)
- A/B upload, spectrogram analyzer, channel/relay scoring
