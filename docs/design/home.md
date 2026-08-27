# Page: Analyze (Home) — `home.md`

The working tool. A single long scroll, numbered like a lab protocol: `1. AUDIO CLIPS` → `2. EXPECTED CHANNEL BASELINE` → `3. COMPARE` → `RESULTS` (verdict + scientific evidence). Everything below the fold appears only after a successful analysis. The spectrogram analysis visualizer is the centerpiece of the page and should occupy the most visual weight below the verdict.

---

## S0. Navbar
Global sticky navbar (see design.md §6). Active link: `ANALYZE`.

**Animation:** none beyond the shared hover underline sweep (green 2px line grows left→right, 150ms).

---

## S1. Hero / Intro
**Layout:** content column (max 760px, left-aligned within the 1180px container), padding 96px top / 48px bottom.

- Eyebrow label: `A/B CALL COMPARISON · SECOND-HOP RELAY FORENSICS` — uppercase micro, `green`, letter-spacing 0.18em, preceded by a 24px green rule.
- H1 (Space Grotesk 600, 56px): **"Did this call pass through a speakerphone twice?"**
- Lead paragraph (19px, `ink-soft`):
  > "Drop a reference clip and a comparison clip. RelayGuard normalizes both to the selected channel baseline, then votes across four independent signals — speech-isolated voice match, relative channel thinness, the CNN relay detector, and a conversation cue — to decide whether Audio B shows the fingerprint of a second-hop speakerphone relay. All analysis runs locally in your browser; audio never leaves this page."
- Below the lead: three small stat chips in a row (pill, hairline border, mono 11px): `7 SIGNALS` · `0 SERVERS` · `4 DEMO CLIPS`.

**Animation:** eyebrow rule grows 0→24px width (300ms), then eyebrow + H1 rise 32px with stagger 0.1s, opacity 0→1; lead paragraph follows 0.15s later; chips stagger 0.06s each. Trigger on load (not scroll).

---

## S2. Section 1 — Audio clips
**Layout:** section label row (`1 · AUDIO CLIPS` uppercase micro with hairline rule extending right), then a 2-column grid (gap 24px) of dropzone cards; stacks on mobile.

Each dropzone card (rounded-2xl, hairline, `paper-deep`, padding 24px, min-height 320px):

**Card A (left):**
- Top row: chip `A` (16px square, `green` fill, paper text, mono bold) + title `Reference call — Audio A` (H3).
- Dropzone interior: 2px dashed `hairline` border (radius 12px), centered `icon-drop.svg#wave-upload` (32px, `ink-faint`), text: **"Drag & drop audio here"** (15px) + sub `or` + two small buttons: `Browse files` (outline) and `Record` (outline, mic icon). Accepts any audio format; decoded client-side.
- Demo row: label `TRY A DEMO:` (mono 10px, `ink-faint`) + two small chips:
  - `Normal · direct (quiet room)` → loads `/public/demo/normal-direct.m4a`
  - `Noisy · direct` → loads `/public/demo/noisy-direct.m4a`
- Loaded state: file row shows filename (mono, truncated), duration + sample rate badge (mono 11px `ink-faint`), a 120px-wide mini waveform thumbnail (green), and a `✕ Remove` ghost button.
- Footer note (mono 11px, `ink-faint`): `Plays as: <selected baseline>` on the left; `Original recording — unprocessed` on the right.

**Card B (right):** identical structure; chip `B` is `red` fill; title `Comparison clip — Audio B`; demo chips:
- `Normal · speakerphone` → `/public/demo/normal-speakerphone.m4a`
- `Noisy · speakerphone` → `/public/demo/noisy-speakerphone.m4a`
Waveform thumbnail renders in `red`.

**Interactions:** drag-over → marching-ants dashed border + `green` (A) / `red` (B) 4% tint wash + drop icon scales 1.1. File accepted → 240ms accent border pulse, card content cross-fades from empty to loaded state (Framer Motion layout animation, 250ms). Remove → content collapses back to empty state.

**Animation:** cards rise 36px, stagger 0.12s, trigger at 20% viewport.

---

## S3. Section 2 — Expected channel baseline
**Layout:** section label `2 · EXPECTED CHANNEL BASELINE`, then 3 radio cards in a row (gap 16px; stack on mobile). Each card: rounded-2xl, padding 20px, title row + description + a tiny band diagram strip (inline SVG, 100% wide, 36px tall, showing the passthrough band for that mode in `green-tint` with red dashed edges).

1. **Good — clean recording**
   > "Wideband 16 kHz passthrough. Expect energy well above 3.4 kHz; thinness margins are tight, so even mild high-frequency loss counts against B."
   Band strip: shaded 0–8000 Hz.
2. **Okay — normal phone** *(default selected)*
   > "Standard 8 kHz telephony with a mild ~3.6 kHz lowpass. Most cellular and landline calls land here; this is the baseline for typical A/B comparisons."
   Band strip: shaded 300–3600 Hz.
3. **Poor — prison phone**
   > "300–3400 Hz bandpass, heavy mu-law compression and audible line noise. Both clips are expected to be thin — relay evidence then rests on the other signals."
   Band strip: shaded 300–3400 Hz with a noise-tick texture below the axis.

Selected card: `green-tint` bg, 1.5px `green` border, circular radio dot filled green (animated scale-in 150ms). Hover on unselected: border darkens to `ink-faint`, 120ms.

**Animation:** cards stagger 0.1s, rise 28px; the band strip inside the selected card animates its shaded region from 0 width to full (400ms) on selection change.

---

## S4. Section 3 — Compare controls
**Layout:** left-aligned row of buttons + right-aligned status hint, inside a hairline rule sandwich (1px rules above/below, padding 24px 0).

- Primary button `Compare` (green fill, 16px, padding 14px 32px) — disabled until both clips loaded.
- Secondary button `Scan B in intervals (20 s+)` (outline, hairline border) — disabled until both clips loaded and B duration ≥ 20s; runs a sliding-window scan producing a per-interval relay score timeline (see S7 note).
- Hint text right (mono 12px, `ink-faint`): while disabled → `Drop both clips to enable comparison.`; while running → `Analyzing… <stage name>` (stages cycle: `decoding → resampling → VAD gating → spectral statistics → relay model → voting`), with a thin green progress hairline (2px) under the buttons that fills left→right per stage.

**Animation:** on `Compare` click, button label cross-fades to a spinner + `Analyzing`; stage text swaps with 200ms fades. On completion, page auto-scrolls (Lenis, 800ms) to the Results anchor.

---

## S5. Asset / status checklist card
**Layout:** a slim card (rounded-2xl, hairline, `paper-deep`, padding 16px 20px) rendered as a 2-column checklist. Each row: green check icon (`icon-drop.svg#check`, `green`), label (14px), and right-aligned mono `HTTP 200` / `READY` (`ink-faint`).

Rows:
- `Voice match model (MFCC + VAD gate)` — `READY`
- `Relay detector (CNN, bundled weights)` — `READY`
- `DSP core (16 kHz mono resampler)` — `READY`
- `Demo clips ×4` — `HTTP 200`
- `Analysis sandbox (no network)` — `READY`

**Purpose:** communicates "everything runs locally, models loaded" — a forensic-instrument self-check.

**Animation:** rows stagger 0.07s, slide in 16px from left, check icons draw (stroke-dashoffset 400ms). Trigger at 25% viewport.

---

## S6. RESULTS — Verdict card  *(rendered only after Compare)*
Anchor `#results`. Section label `RESULTS` (uppercase micro) with a small mono timestamp right-aligned: `RUN 2025-… · BASELINE: OKAY — NORMAL PHONE`.

**Layout:** full-width card (rounded-2xl, hairline, padding 32px), split into left verdict zone (fixed 340px) and right explanation zone.

Left zone:
- Big verdict badge: rounded-2xl tinted card, uppercase letter-spaced (0.14em) 30px text + icon, one of:
  - `MATCH` — `green-tint` bg, `green-deep` text, check icon — "B is consistent with A's channel."
  - `SUSPICIOUS RELAY` — `red-tint` bg, `red-deep` text, alert-triangle icon — "B shows additional second-hop degradation."
  - `UNCERTAIN` — `amber-tint` bg, `amber`-deep text, question icon — "Signals disagree."
- Confidence bar below: hairline-framed track (height 10px, radius 5px), fill in verdict color, width = confidence %, mono label right: `CONFIDENCE 78%`. Bar animates 0→value (700ms, ease-out).
- Under the bar, mono micro-readout: `WEIGHTED SCORE 0.64 / 1.00 · VOTES 4 OF 6`.

Right zone — explanation paragraph (16px, line-height 1.65). It must cite every signal's numbers, e.g.:
> "Speech-isolated voice match scored **0.83** (MFCC cosine over 12 gated segments), so both clips plausibly carry the same speaker. But B is measurably thinner than A even after normalizing to the Okay baseline: B's spectral centroid sits at **2 055 Hz** against A's **717 Hz**, with **94.6%** of B's energy inside the 300–3400 Hz band versus **61.9%** for A — a thinness delta of **0.33**, well past the **0.16** margin. The relay detector flags B at **0.71 (RED)** versus A at **0.18 (GREEN)**; B's envelope is compressed (burst CV **0.41**, gap depth **−6.2 dB**) and its noise bed is elevated (**−31.5 dB**, SNR **11.9 dB**). The conversation cue agrees (long-term spectrum correlation **0.78**). Four of six weighted votes point at a second-hop relay."

(Numbers above are illustrative; the real paragraph is generated from computed metrics — implementation pulls from the analysis result object.)

**Animation:** verdict badge springs in (scale 0.92→1, overshoot), tint wipes left→right (300ms); confidence bar fills; explanation paragraph reveals word-block by word-block (3 blocks, stagger 0.15s, opacity 0→1, y 12px). The whole card pins briefly? — **No pin**; keep it simple and readable.

---

## S7. RESULTS — Scientific evidence  *(the centerpiece)*
Section header block (padding-top 64px):
- Eyebrow: `SCIENTIFIC EVIDENCE` (uppercase micro, green).
- H2 (30px): "Everything the detector sees."
- Sub (15px, `ink-soft`):
  > "Everything below is computed in this page from the channel-normalized audio — exactly what the detector analyzes."

A toolbar row sits under the header (right-aligned): `Re-run analysis` ghost button (triggers the scanline sweep again), and a mono toggle `NORMALIZED` / `ORIGINAL` that swaps all visualizers between processed and raw audio.

### S7.1 Waveforms (channel-normalized)
**Layout:** two stacked panels (gap 16px), full content width, each 160px tall canvas inside a card (rounded-2xl, hairline, padding 16px).

- Panel A: eyebrow row `A · REFERENCE — NORMALIZED` + right badge `NORMALIZED TO · OKAY — NORMAL PHONE` (mono 10px, green-tint chip). Mirrored filled waveform in `green` on `canvas-bg`; x-axis ticks every 2s (IBM Plex Mono 10px, `ink-faint`); center zero-line 1px `hairline`.
- Panel B: same, red waveform, eyebrow `B · COMPARISON — NORMALIZED`.
- Speech-turn highlighting: VAD-gated speech segments drawn as 6%-opacity accent-tint bands behind the waveform; hovering a band shows a tooltip `speech turn 3 · 4.2 s → 7.8 s`.

**Animation:** on reveal, waveform draws left→right as a clip-path wipe (900ms per panel, staggered 150ms); speech-turn bands fade in after.

### S7.2 Spectrogram — Audio A (0–4 kHz)  ★ centerpiece
**Layout:** full-width card (rounded-2xl, hairline, padding 20px). Header row: eyebrow `SPECTROGRAM — AUDIO A (0–4 KHZ)` + right legend: small colormap strip (paper-deep → green → ink, 80×10px) labeled `ENERGY`.

- Canvas: full width × **420px tall** — the largest canvas on the page. Y-axis 0–4 kHz (linear), ticks every 500 Hz; X-axis time in seconds. Colormap: paper-deep → green → ink (ink-density look).
- **Telephone-band edge lines:** dashed `red` horizontal lines at 300 Hz and 3400 Hz, 6px dash / 4px gap, with right-edge mono labels `300 Hz` and `3.4 kHz` inside tiny red-tint chips.
- Hover: crosshair (`crosshair` cursor) + hairline cross lines + floating mono tooltip (rounded 8px, ink bg, paper text): `t = 3.42 s · f = 1 812 Hz`.
- Caption strip below canvas (hairline top border, padding-top 12px), mono 12px:
  > `95% of spectral energy lies below 2 859 Hz, with 94.6% of energy inside the 300–3400 Hz telephone band and 3.4% above 3.4 kHz.`
  (values computed live; A's numbers for panel A, B's for panel B)

### S7.3 Spectrogram — Audio B (0–4 kHz)
Identical to S7.2, with eyebrow `SPECTROGRAM — AUDIO B (0–4 KHZ)`. A thin `red` 2px top border on this card (instead of green) ties it to the B accent.

**Animation (shared for both spectrograms — the signature moment):** when scrolled into view (trigger 30% viewport) or on re-run: canvas content reveals via a left→right clip wipe led by a 2px `red` vertical scanline (1.2s, ease-in-out); immediately after, the dashed band-edge lines draw in (stroke-dashoffset, 400ms) and their labels pop (scale 0.8→1, 120ms). With reduced motion: simple opacity fade.

### S7.4 Band-energy fingerprint ("thinness proof")
**Layout:** half-width-left card? No — full-width card, but the chart itself occupies the center 720px, conclusion caption below.

- Header: eyebrow `BAND-ENERGY FINGERPRINT` + chip `THINNESS PROOF` (amber-tint, mono 10px).
- Grouped bar chart (canvas or SVG): three groups on x-axis — `SUB-300 HZ`, `IN-BAND 300–3400 HZ`, `ABOVE 3.4 KHZ`; each group has two bars: A (`green`) and B (`red`); y-axis 0–100%, gridlines every 20% (1px `hairline`); percentage labels on top of each bar (mono 11px).
- Conclusion caption (14px body, `ink-soft`, max 720px), computed:
  > "B holds **97.8%** of its energy in-band vs A's **98.3%** — after normalizing for the Okay baseline, B is **NOT measurably thinner** than A." *(or the opposite phrasing when the delta exceeds the mode margin — both phrasings exist in copy)*

**Animation:** bars grow from baseline (600ms, stagger 0.08s per bar, ease-out cubic); percentage labels count up.

### S7.5 Signal-by-signal evidence readout
**Layout:** full-width card; header eyebrow `SIGNAL-BY-SIGNAL EVIDENCE` + right mono note `WEIGHTS: CHANNEL ×1.0 · VOICE ×0.6 · RELAY ×0.5 · ENVELOPE ×0.5 · SMEAR ×0.5 · CONVERSATION ×0.5`.

Seven accordion rows (shadcn Accordion, hairline separators). Each collapsed row shows: signal name (uppercase micro, 13px), a one-line verdict phrase, its key number (mono), a mini horizontal contribution bar (weight-scaled, colored by whether it supports MATCH (green) or RELAY (red) or is UNAVAILABLE (hairline hatch)), and a chevron. Expanded content shows a MetricRow table (label / A value / B value / interpretation) — all values IBM Plex Mono 12px, 3-column hairline table on `paper-edge` inset.

Rows and their expanded metrics:

1. **VOICE MATCH** — weight ×0.6
   - `mfcc cosine similarity (speech-isolated)` · `score 0–1`
   - `F0 median Hz (A / B)` · `F0 p25–p75` · `voiced fraction` · `semitone distance` · `pitch class: male-typical / female-typical / ambiguous`
   - `speech turns` — list of `start_s → end_s` segment chips
2. **CHANNEL THINNESS** — weight ×1.0
   - `spectral centroid Hz` · `p95 Hz` · `p99 Hz` · `energy < 300 Hz` · `energy > 3400 Hz` · `energy > 4000 Hz` · `in-band fraction` · `thinness score` · `delta vs margin (poor mode margin 0.16)`
3. **RELAY FINGERPRINT (CNN)** — weight ×0.5
   - `fused relay score 0–1 (A / B)` with GREEN / AMBER / RED state chips per clip
4. **ENVELOPE DYNAMICS** — weight ×0.5
   - `speech duty cycle` · `burst count` · `burst CV` · `gap depth dB` · `dynamic range dB`
   - if `< 2 bursts`: row renders as `UNAVAILABLE — fewer than 2 speech bursts` in `ink-faint` italic, contributes no vote
5. **SPECTRAL SMEAR** — weight ×0.5
   - `spectral flatness on bursts (A / B)` · `gap-vs-burst dB difference`
6. **NOISE BED** — (diagnostic, shown in readout)
   - `SNR dB` · `noise bed dB (20th-pct frame)` · `speech dB` · label chip: `quiet` / `elevated` / `very_noisy` (green-tint / amber-tint / red-tint)
7. **CONVERSATION CUE** — weight ×0.5
   - `long-term average spectrum correlation` (≥ 0.72 → "shared content likely") · `duty-cycle comparison` · `turn-count comparison`

**Animation:** rows stagger 0.06s on scroll-in; accordion expansion is a height spring (stiffness 300, damping 30) with the expanded table fading in 100ms after open; contribution bars draw 0→value when their row is first expanded.

### S7.6 Interval scan results *(only when "Scan B in intervals" was run)*
**Layout:** full-width card; eyebrow `INTERVAL SCAN — AUDIO B`.
- A strip timeline canvas (full width × 120px): one cell per analysis window, cell fill from `green-tint` (score 0) → `red-tint` (score 1) with score printed mono inside cells ≥ 40px wide; x-axis time. Hovering a cell: tooltip `12.0–16.0 s · relay score 0.71 (RED)`.
- Caption: `Windows scoring RED suggest the relay hop is intermittent — present only in part of the clip.`

**Animation:** cells cascade in left→right (stagger 0.03s, y 8px).

---

## S8. Footer
Global footer (design.md §6), with the Instrument Serif line "Verdicts are forensic cues, not proof."

---

## Empty / edge states
- **Only one clip loaded:** Compare stays disabled; the loaded card shows a mono hint `Waiting for the other clip…`.
- **Unsupported/corrupt file:** dropzone border flashes red; inline error under the card (red, 13px): `Couldn't decode this file. Try WAV, MP3, or M4A.`
- **Clip < 1.5 s:** allowed, but the envelope row shows UNAVAILABLE and the verdict explanation notes reduced confidence.
- **Re-running with a different baseline:** all evidence panels cross-fade (250ms) and re-sweep; a mono diff note appears under the verdict: `Baseline changed from Okay → Poor · numbers re-computed`.

## Page assets used
- `logo.svg` (navbar/footer), `icon-drop.svg` (dropzones, checklist, verdict icons), `paper-texture.png` (global bg).
- No raster imagery on this page — every visual is live canvas from real audio.
