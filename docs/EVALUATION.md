# RelayGuard — Evaluation & Scoring Rules

This document defines the scoring rules exactly as shipped in v7 (see `src/lib/audio/`), the calibration
methodology, and all held-out results. Use it to compare any improvement fairly: re-run the same corpora
with the same thresholds and report the same metrics.

## 1. Pipeline

Audio A (reference) and Audio B (suspect) are each decoded to mono 16 kHz (`decode.ts`), then analysed by
three independent layers:

1. **Channel/relay layer** — handset vs speakerphone channel evidence (`channel.ts`, `features.ts`, `compare.ts`)
2. **Challenge-probe layer** — B recorded while a seeded noise probe plays; probe recurrence in B is measured (`probe.ts`)
3. **Voice-biometric layer** — 5-matcher calibrated panel deciding same/different speaker (`voice.ts`, `voiceCalibration.ts`)

`compare.ts` fuses layers into the final verdict. Hard precedence rules:

- **SAME voice consensus (≥3/5, 0 opposing) overrides quality flags** — same voice is never flagged for being
  thin / bass-depleted / speaker-like.
- **DIFFERENT voice consensus vetoes MATCH** regardless of channel scores.
- Strict quality flags (v4): `BASS_DEPLETED`, thin-spectrum, and smear flags are asserted with spectrogram
  evidence whenever A is the reference-quality clip and B violates them — unless SAME consensus applies.

## 2. Channel layer scoring

RBJ biquad channel simulation with three baselines (good / okay / poor) plus mu-law telephony reference.
Band margins: **0.03 (good), 0.05 (okay), 0.08 (poor)**. Features per clip: band energies (bass / low-mid /
presence / brilliance over the 300–3400 Hz telephony band), spectral smear, duty-cycle cue, noise-bed level,
VAD-gated speech statistics (`vad.ts`, STFT 1024/512 Hann, `stft.ts`).

`compare.ts` converts feature pairs into weighted votes → `MATCH` (B plausibly A through a legitimate channel),
`MISMATCH`, or `UNCERTAIN`. Field anchors measured by the project owner (same noisy room, two phones):

| cue | handset | speakerphone |
|---|---|---|
| noise bed vs speech | −67 dB | −8.5 dB |
| spectral smear | 0.0034 | 0.1469 (≈43×) |
| duty cue | sign flips in noise — must be read together with the noise measurement | |

## 3. Challenge probe

Deterministic, reproducible from the spec (`probe.ts`):

- mulberry32 PRNG, seed `0x5eed` → white noise
- HP 500 Hz (Q 0.707) ×2 → LP 6000 Hz (Q 0.707) → peaking 2000 Hz (Q 0.9, +4 dB)
- RMS normalized to 0.25; 4 s loop with 50 ms equal-power seam crossfade
- playback gain `0.5 × level/100` (70% → 0.35)

Verdict rule: probe energy recurring inside B at the expected lag votes for speakerphone relay (the probe could
only enter B acoustically). Reference files: `docs/labelled-examples/` and `challenge-noise-70pct-*.wav/mp3`.

## 4. Voice panel (v5–v7)

Five matchers, each mapping a raw score through its shipped logistic `p = 1/(1+exp(−(a·raw+b)))`
(params in `src/lib/audio/voiceCalibration.ts` / `docs/voice-calibration.json`):

| matcher | raw score | held-out EER |
|---|---|---|
| mfcc_v2 | cosine of 50-dim [mean(25), 0.5·std(25)] of 13 MFCC + deltas (c0 dropped), mean-centered | 16.7% |
| fisher | negative weighted L2 distance, 50 corpus-trained Fisher weights | 14.7% |
| formant | LPC-12, 0.97 pre-emphasis, polynomial-root F1/F2/F3 | 25.3% |
| f0 | exp(−|Δsemitones|/3.5) | 28.5% |
| ltas | cosine of 24 log bands, 200–3600 Hz | 16.1% |

Voting: p ≥ **0.60** → same; p ≤ **0.40** → different; else abstain.
Consensus: **≥3 same-votes with 0 different-votes → SAME; ≥3 different-votes with 0 same-votes → DIFFERENT;
otherwise NO_CONSENSUS.** A 3/5 agreement rule means abstentions and single dissenters block certainty by design.

## 5. Calibration methodology

- Corpus: 32 VoxForge male speakers (F0 < 160 Hz) + project owner's voice = 33 speakers.
- Train pairs: mixed clean + simulated-relay pairs (clean-only calibration was tried and rejected — it produced
  0 SAME consensus under relay).
- Logistic (a, b) per matcher fitted on train; Fisher weights (50) trained on corpus statistics.
- Held-out evaluation on disjoint pairs.

## 6. Held-out results (shipped)

| evaluation | result |
|---|---|
| clean same-speaker detected (SAME consensus) | 96/180 |
| clean false-same | **0.8%** |
| relay false-same | **0%** |
| user voice vs 32 other males | 25 DIFFERENT / 7 NO_CONSENSUS / **0 SAME** |

Fixture tallies (`docs/test-fixtures/`, 8 male speakers × 2 utterances + user voice): all cross-speaker pairs
DIFFERENT or NO_CONSENSUS; same-speaker pairs SAME except the known conservative boundary
(GusSCalabrese pair, creaky tail, F0 105→86 Hz → DIFFERENT), consistent with the 1/180 held-out
false-different rate.

## 7. Regression cases

See `docs/labelled-examples/manifest.json`:

- **case1** — the v6-era false MATCH (87%) on two different men; panel post-calibration returns 5/5 DIFFERENT.
- **case2** — different-speaker pair correctly not matched at v7 (UNCERTAIN + 5/5 DIFFERENT + BASS_DEPLETED).

Any scoring change must be reported against: held-out clean/relay false-same rates, the user-vs-32-males
matrix, the fixture tallies, and both regression cases.
