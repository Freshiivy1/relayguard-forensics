# Changelog

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
