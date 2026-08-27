# Page: Methodology — `methodology.md`

Explains the science: what a second-hop speakerphone relay is, how each of the seven signals works, how the weighted vote produces a verdict, and how to read the spectrogram evidence. This page should feel like a forensic lab's methods paper — numbered sections, annotated diagrams, worked numbers from the bundled demo clips. It doubles as the marketing/education surface for visitors who land here before trusting the tool.

---

## S1. Hero — What is a second-hop relay?
**Layout:** content column (max 760px) left, diagram right on desktop (stacked on mobile); padding 96px top / 64px bottom.

- Eyebrow: `METHODOLOGY` (uppercase micro, green, 24px rule before it).
- H1 (48px): "How a speakerphone leaves fingerprints."
- Lead (18px, `ink-soft`):
  > "A second-hop relay happens when call audio is played out loud — over a speakerphone, a hands-free kit, another phone on a table — and re-captured by a second microphone before re-entering the network. The room, the loudspeaker, and the second telephony hop all stamp the audio. RelayGuard measures those stamps."
- Right/under: `method-diagram-relay.svg` (see design.md §8) — handset → network (green node) → loudspeaker radiating in a room → second handset (red node) → network. Labels in mono uppercase: `FIRST HOP`, `ROOM + LOUDSPEAKER`, `SECOND HOP`.

**Animation:** eyebrow + H1 + lead rise 32px, stagger 0.1s on load. Diagram nodes draw in sequence along the signal path (stroke-dashoffset, 300ms per segment, 900ms total), with a small green dot traveling the path once (2s) to show the audio's journey.

---

## S2. The analysis pipeline
**Layout:** section label `THE PIPELINE`, then a horizontal 5-step flow (vertical stack on mobile). Steps are connected by a 1px hairline with arrow ticks; each step is a small card (rounded-2xl, hairline, `paper-deep`, padding 16px).

Steps (mono step number + 15px title + 13px description):
1. `01 DECODE` — "Any browser-supported audio format, decoded locally via Web Audio. Nothing is uploaded."
2. `02 NORMALIZE` — "Both clips are resampled to 16 kHz mono and shaped to the selected channel baseline — Good, Okay, or Poor."
3. `03 GATE` — "A voice-activity detector isolates speech turns; every subsequent measurement is taken on speech, not silence."
4. `04 MEASURE` — "Seven independent signals are computed: voice match, channel thinness, the CNN relay fingerprint, envelope dynamics, spectral smear, noise bed, and the conversation cue."
5. `05 VOTE` — "Weighted votes are fused into a single score → MATCH, SUSPICIOUS RELAY, or UNCERTAIN, with confidence."

**Animation:** steps stagger 0.09s, rise 24px; the connecting hairline draws left→right behind them (600ms). Trigger at 25% viewport.

---

## S3. The seven signals
**Layout:** section label `THE SIGNALS`. Seven stacked full-width blocks, alternating text-left/figure-right (stack on mobile), separated by hairline rules, 72px vertical padding each. Every block: index number (mono, 48px, `ink-faint`), uppercase micro signal name + weight chip (`WEIGHT ×1.0` etc., green-tint mono chip), H3 title, 2–3 paragraph explanation (15px), a "what it looks like when relayed" callout (red left-border 2px, 13px, `ink-soft`), and a figure (small live-style canvas mock or SVG — see per-signal notes).

1. **VOICE MATCH** — `×0.6`
   - "Before asking *how* B was captured, we ask *who* is speaking. MFCC vectors are computed only on VAD-gated speech turns and compared by cosine similarity, so channel differences don't contaminate the speaker comparison. F0 statistics (median, p25/p75, voiced fraction, semitone distance, pitch-class label) act as a sanity check."
   - Callout: "A relay preserves the speaker — a low voice-match score argues the two clips may not be the same conversation at all."
   - Figure: two overlapping MFCC-trajectory sparkline canvases (A green / B red) with a mono similarity readout `0.83`.
2. **CHANNEL THINNESS** — `×1.0` *(the strongest signal — visually the largest block)*
   - "Every telephony hop removes frequency content. A normal call already discards everything above ~3.6 kHz; a speakerphone relay adds the loudspeaker's limited bandwidth and a second encode. We measure spectral centroid, p95/p99, energy below 300 Hz and above 3400/4000 Hz, and fuse them into a thinness score. B's thinness is compared to A's **after both are normalized to the same baseline**, with a per-mode margin (0.16 in Poor mode) before it counts as evidence."
   - Callout: "A relayed clip holds nearly all its energy inside the 300–3400 Hz telephone band, with abnormal leakage above 3.4 kHz from the loudspeaker."
   - Figure: `method-diagram-band.svg` — 0–8 kHz axis, telephone band shaded, dashed red edges at 300/3400 Hz.
3. **RELAY FINGERPRINT (CNN)** — `×0.5`
   - "A small convolutional network, bundled with the page, classifies per-clip spectrogram patches as direct-capture or relayed. Scores fuse to a per-clip relay score (0–1) with GREEN / AMBER / RED states."
   - Callout: "The model was trained on exactly this failure mode: room reverb plus loudspeaker coloration plus a second mu-law pass."
   - Figure: three state chips (`0.18 GREEN` green-tint, `0.52 AMBER` amber-tint, `0.71 RED` red-tint) as large mono readouts.
4. **ENVELOPE DYNAMICS** — `×0.5`
   - "A loudspeaker and room compress the amplitude envelope: bursts merge, gaps fill in with reverb, and the duty cycle flattens. We measure speech duty cycle, burst count, burst coefficient of variation, gap depth in dB, and dynamic range. Fewer than two bursts → the signal reports UNAVAILABLE and abstains."
   - Callout: "Relayed speech shows lower burst CV and shallower gaps — the room never lets the audio go truly quiet."
   - Figure: two mini envelope traces (A: deep valleys, green; B: filled-in valleys, red) sharing one axis.
5. **SPECTRAL SMEAR** — `×0.5`
   - "Room reverberation smears spectral structure. We measure spectral flatness on speech bursts and the gap-vs-burst dB difference; relay smear raises flatness and collapses the gap/burst contrast."
   - Callout: "Direct capture of the demo speaker: flatness 0.0033. The same voice relayed over a speakerphone: 0.0224 — roughly 7× flatter."
   - Figure: two 40-bin spectrum bars (A crisp peaks green, B smeared red) — drawn as canvas mock.
6. **NOISE BED** — diagnostic
   - "The 20th-percentile frame level estimates the noise bed; SNR compares it to speech level. A relayed clip inherits the room's bed plus line noise from the second hop."
   - Callout: "Labels: quiet / elevated / very_noisy. A 'very_noisy' bed on B with a 'quiet' bed on A is strong corroboration, never proof alone."
   - Figure: a dB ruler (vertical, −90 to 0 dB) with two markers (A `−88.5 dB`, B `−31.5 dB`) — from the demo measurements.
7. **CONVERSATION CUE** — `×0.5`
   - "Do A and B contain the same conversation? We correlate the long-term average spectra (≥ 0.72 suggests shared content) and compare duty cycles and turn counts. This guards against false alarms when B is simply a different call."
   - Callout: "High correlation with matching turn structure: same conversation, different capture path — exactly the relay scenario."
   - Figure: correlation gauge (arc 0–1) with needle at `0.78` and a `≥ 0.72` threshold tick.

**Animation (per block):** index number counts/slides in first (y 20px), then text rises 28px (stagger 0.08s), then the figure reveals with a left→right clip wipe (500ms) — echoing the home page's scanline language. Trigger each block at 25% viewport.

---

## S4. The weighted vote
**Layout:** section label `THE VOTE`; a centered formula card (rounded-2xl, hairline, padding 32px, max 860px) followed by a worked-example strip.

Formula card content:
- Title: "Six votes, one score."
- A horizontal stacked-bar diagram (SVG, full card width, 48px tall): segments for each signal, width ∝ weight (channel 1.0 widest, voice 0.6, four ×0.5 segments), each segment filled green or red depending on which way it voted in the worked example; hover a segment → tooltip with signal name, weight, vote, contribution.
- Below, mono formula line: `score = Σ(voteᵢ × weightᵢ) / Σ(weightᵢ)` and verdict thresholds as three chips: `MATCH score ≤ 0.35` (green-tint) · `UNCERTAIN 0.35–0.6` (amber-tint) · `SUSPICIOUS RELAY ≥ 0.6` (red-tint).
- Note (13px, `ink-soft`): "UNAVAILABLE signals abstain and their weight is removed from the denominator. Confidence scales with the distance of the score from the nearest threshold and with the number of agreeing signals."

Worked-example strip (mono 12px, hairline-top, padding-top 16px): `voice 0.83×0.6 + channel 0.33Δ×1.0 + relay 0.71×0.5 + envelope ×0.5 + smear ×0.5 + conversation 0.78×0.5 → 0.64 → SUSPICIOUS RELAY · 78%`

**Animation:** stacked bar draws segment-by-segment left→right (stagger 0.12s, scaleX from left); threshold chips pop (scale 0.9→1) after.

---

## S5. Reading the spectrograms
**Layout:** section label `READING THE EVIDENCE`; two-column: sticky left text column (40%) + right column (60%) with an annotated spectrogram figure (canvas mock replicating the home-page style, 420px tall, with four numbered callout pins).

Sticky text steps (numbered 1–4, 15px):
1. "The dashed red lines are the telephone band edges — 300 Hz and 3 400 Hz. Energy hugging the band means telephony; energy far above it means a cleaner channel."
2. "Dark density is energy. A relayed clip looks *thinner and busier*: less low body below 300 Hz, hot sibilant hash above 3.4 kHz from the loudspeaker."
3. "Look at the gaps. Direct speech goes pale between bursts; relayed speech stays grey — reverb and room noise fill the valleys."
4. "Compare the captions: '95% of spectral energy lies below…' plus the in-band and above-band percentages are the numbers behind the thinness vote."

Callout pins on the figure (numbered circles, green, 20px, mono) anchor at: band-edge lines, a hot >3.4 kHz region, a filled-in gap, the caption strip. Hovering a pin highlights the matching text step (green underline).

**Animation:** the figure reveals with the signature scanline sweep (1.2s) at 30% viewport; pins pop sequentially (stagger 0.15s, scale 0.6→1 with spring). The sticky text column scrolls normally while the figure stays pinned for the block's height (ScrollTrigger pin, ~120vh).

---

## S6. CTA band
**Layout:** centered band (padding 96px 0, hairline top): Instrument Serif italic line (26px) — "The fastest way to understand the signals is to watch them disagree." — then a green primary button `Try it on the demo clips` linking to `/#results` flow (loads normal-direct as A and noisy-speakerphone as B, baseline Okay).

**Animation:** quote fades/rises 20px; button staggered 0.15s after.

## Page assets used
- `method-diagram-relay.svg` (S1), `method-diagram-band.svg` (S3 block 2), `logo.svg`, `icon-drop.svg`, `paper-texture.png`.
