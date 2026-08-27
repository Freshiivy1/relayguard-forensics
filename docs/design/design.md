# RelayGuard — Global Design Document

A 100% client-side A/B call-comparison forensics web app. The user uploads a reference call clip (Audio A) and a suspect clip (Audio B); the app normalizes both to a selectable channel baseline, runs a multi-signal analysis entirely in the browser, and renders a verdict (MATCH / SUSPICIOUS RELAY / UNCERTAIN) with a rich "Scientific evidence" section whose centerpiece is the per-clip spectrogram analysis visualizer.

**Tagline:** `A/B call comparison · second-hop relay forensics`

**Product feeling:** a forensic laboratory bench rendered in software — calm, precise, archival. Warm paper, dark ink, instrument-green and evidence-red. No neon, no gradients-for-decoration, no dark mode. The UI should feel like a well-made measuring instrument: hairline rules, uppercase micro-labels, monospace numeric readouts, and canvases that look printed rather than glowing.

---

## 1. Tech Stack & Dependencies

- Vite 7 · React 19 + TypeScript · Tailwind CSS v3.4.19 · shadcn/ui (Card, Button, RadioGroup, Tabs, Accordion, Tooltip, Badge, Progress, Separator, Table)
- **Canvas 2D** for all visualizers (waveforms, spectrograms, band-energy chart) — custom drawing, no chart library, so styling fully matches the palette
- **GSAP + ScrollTrigger** — scroll-driven evidence-section reveals, pinned verdict card, spectrogram "scanline sweep" animation
- **Framer Motion** — dropzone states, verdict badge pop, accordion drawers, tab transitions, hover micro-interactions
- **Lenis** — smooth scrolling site-wide
- **Web Audio API + custom DSP (client-side)** — decode, resample to 16 kHz mono, STFT/MFCC, VAD gating, spectral statistics (implementation concern, but design assumes all numbers are computed live)
- Google Fonts: **Space Grotesk** (UI/display) + **IBM Plex Mono** (numeric readouts, labels inside visualizers) + **Instrument Serif** (sparingly — verdict explanation lead-ins, section pull-quotes; gives the "forensic report" note)

---

## 2. Color Palette

All colors are flat solids or soft tints. No gradients except a very subtle paper-texture tint on the page background.

| Token | Hex | Usage |
|---|---|---|
| `paper` | `#F5F2EC` | Page background (warm cream) |
| `paper-deep` | `#EDE9E0` | Card backgrounds, inset panels, dropzone fill |
| `paper-edge` | `#E3DED3` | Recessed zones inside cards, table row striping |
| `ink` | `#1C1B18` | Primary text (near-black, warm) |
| `ink-soft` | `#57544B` | Secondary text, captions |
| `ink-faint` | `#8A867A` | Tertiary text, axis labels, disabled |
| `hairline` | `#D8D2C4` | 1px borders on cards, rules, table lines |
| `green` | `#2F5B4C` | Primary accent — Audio A, primary buttons, selected radio card, MATCH verdict |
| `green-deep` | `#244A3D` | Hover state on green buttons, verdict badge text |
| `green-tint` | `#DCE6DF` | MATCH badge background, selected radio card tint, checklist checks |
| `red` | `#A4453A` | Audio B accent — waveform B, bars B, spectrogram B frame, telephone-band edge dashed lines |
| `red-deep` | `#8A372D` | SUSPICIOUS RELAY badge text |
| `red-tint` | `#F0DDD8` | SUSPICIOUS RELAY badge background |
| `amber` | `#B07E2B` | UNCERTAIN accents, warning notes |
| `amber-tint` | `#F0E4CC` | UNCERTAIN badge background |
| `canvas-bg` | `#FBF9F4` | Plot area background inside visualizers (lighter than card) |

**Spectrogram colormap:** custom sequential map on the canvas — low energy `paper-deep #EDE9E0` → mid `green #2F5B4C` → high `ink #1C1B18` (energy reads as dark ink density on paper, not heat). Telephone-band edge lines are dashed `red #A4453A`.

---

## 3. Typography

| Role | Font | Size / Weight / Tracking |
|---|---|---|
| Eyebrow / section label | Space Grotesk 500, UPPERCASE | 11–12px, letter-spacing `0.18em` |
| H1 (page title) | Space Grotesk 600 | 44–64px, tight `-0.02em`, line-height 1.05 |
| H2 (section title) | Space Grotesk 600 | 28–34px, `-0.01em` |
| H3 (card title) | Space Grotesk 600 | 18–20px |
| Body | Space Grotesk 400 | 15–16px, line-height 1.6, `ink-soft` |
| Lead paragraph | Space Grotesk 400 | 17–19px, line-height 1.65 |
| Numeric readouts / metrics | IBM Plex Mono 400–500 | 12–14px, tabular-nums |
| Canvas axis/tick labels | IBM Plex Mono 400 | 10–11px, `ink-faint` |
| Verdict badge text | Space Grotesk 600, UPPERCASE | 26–34px, letter-spacing `0.14em` |
| Pull-quote / report voice | Instrument Serif 400 italic | 20–24px |

Rules: never set body text in all caps; caps only for labels and badges. Numeric values in the evidence readout always in IBM Plex Mono.

---

## 4. Spacing, Shape, Elevation

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 px. Section vertical padding 80–120px on the home page flow.
- Max content width **1180px**, centered, 24px side gutters. Evidence visualizers run the full content width.
- Cards: `border-radius: 16px` (rounded-2xl), 1px `hairline` border, background `paper-deep` or `paper` — **no drop shadows anywhere**. Depth comes from hairlines, tints, and inset `paper-edge` zones only.
- Inner plot panels: radius 10px, 1px hairline, `canvas-bg`.
- Buttons: radius 10px (primary) / full-pill for small chips. Primary button: `green` fill, paper text; hover → `green-deep` + 1.02 scale (Framer Motion, 120ms).
- Dividers: 1px `hairline`, full width, with 24px rhythm.

---

## 5. Interaction & Animation Style

- **Lenis smooth scroll** everywhere (lerp 0.09).
- Entrance language: sections rise 28–40px, opacity 0→1, stagger children 0.08–0.12s, trigger at 20% viewport. No rotation, no blur.
- Signature motion: the **spectrogram scanline sweep** — when evidence renders, a thin `red` vertical line sweeps left→right across each spectrogram once (1.2s, ease-in-out), like an analyzer scan, then the band-edge dashed lines draw in. This is the app's hero micro-moment; repeat it on "Re-run analysis".
- Verdict badge: scale 0.92→1 with slight overshoot (spring, stiffness 260, damping 18), tint background wipes in from left.
- Dropzones: border animates from dashed static to a slow marching-ants on drag-over; accepted file gets a 240ms green border pulse.
- Buttons: scale 1.02 on hover, 0.97 on tap, 120ms.
- Accordions (evidence signal rows): height spring, chevron rotates 180°.
- All animations respect `prefers-reduced-motion` (disable sweep, reduce to fades).
- Cursor: default everywhere except dropzones (`copy` on drag-over) and clickable canvas regions (`crosshair` over spectrograms — hovering shows a crosshair with a live Hz/time tooltip).

---

## 6. Shared Components

### Navbar (sticky, all pages)
- Height 64px, `paper` background with 1px `hairline` bottom border, backdrop none (flat).
- Left: wordmark `Relay Guard` — Space Grotesk 600, 18px, with a small square logo mark (`logo.svg`: two stacked waveform bars in green over one in red, suggesting A over relay B).
- Right: nav links (Analyze / Methodology / About) — 12px uppercase 0.14em, `ink-soft`, active link `green` with 2px underline; plus a chip badge: `100% CLIENT-SIDE · NO SERVER` — 10px uppercase mono, `green-tint` background, `green-deep` text, pill.
- Mobile: hamburger → full-height drawer with the same links.

### Footer (all pages)
- `paper-deep` band, hairline top border, 48px padding.
- Left: `Relay Guard` wordmark + line: "Verdicts are forensic cues, not proof." (Instrument Serif italic, 18px, `ink-soft`).
- Center: mini-nav (Analyze / Methodology / About).
- Right: mono microcopy: `ALL ANALYSIS RUNS LOCALLY · AUDIO NEVER LEAVES THIS PAGE`.

### Demo clip system
Four bundled demo clips live in `/public/demo/`:
- `normal-direct.m4a` — "Normal voice, direct capture, quiet room"
- `normal-speakerphone.m4a` — "Normal voice, played over speakerphone" (noted as byte-identical to direct in the bundle — still loadable as its own demo)
- `noisy-direct.m4a` — "High background noise, direct capture"
- `noisy-speakerphone.m4a` — "High background noise, played over speakerphone"

Each dropzone card gets two one-click "Load demo" chips per clip that make sense for its role (A: direct captures; B: speakerphone captures).

### Visualizer primitives (shared, all canvases)
- **WaveformPanel** — amplitude vs time, filled mirrored waveform; A in `green`, B in `red`; time axis in seconds (IBM Plex Mono ticks); paper plot bg; hairline frame; current-baseline badge top-right ("NORMALIZED TO · OKAY — NORMAL PHONE").
- **SpectrogramPanel** — 0–4 kHz vertical axis, time horizontal; custom ink-density colormap; dashed `red` lines at 300 Hz and 3400 Hz labeled `300 Hz` / `3.4 kHz` "telephone band edges"; hover crosshair with mono tooltip (`t = 3.42 s · f = 1 812 Hz`); caption strip below with computed readout: "95% of spectral energy lies below **X Hz**, with **Y%** of energy inside the 300–3400 Hz telephone band and **Z%** above 3.4 kHz."
- **BandEnergyChart** — grouped bar chart, three groups (`sub-300 Hz`, `300–3400 Hz`, `> 3.4 kHz`), A bars green / B bars red, percentage labels on top, conclusion caption.
- **MetricRow** — label (uppercase micro) + mono value + optional mini bar; used throughout the evidence readout.

### Baseline radio cards (shared on home)
Three selectable cards; selected = `green-tint` background + 1.5px `green` border + small green check dot; unselected = `paper-deep` + hairline. Hover: border darkens.

---

## 7. Page List

| Page | File | Description |
|---|---|---|
| Analyze (home) | `home.md` | The full working tool: upload A/B, pick channel baseline, run comparison, verdict card + complete Scientific evidence section (waveforms, per-clip spectrograms, band-energy fingerprint, signal-by-signal readout). Single-scroll, section-numbered. |
| Methodology | `methodology.md` | Explains every detection signal (voice match, channel thinness, relay fingerprint, envelope dynamics, spectral smear, noise bed, conversation cue), the weighted vote, and verdict thresholds — with interactive mini-diagrams and an annotated demo spectrogram. |
| About & Limitations | `about.md` | What the tool can and cannot conclude, privacy model (100% client-side), known failure modes, responsible-use notes, tech credits. |

---

## 8. Assets

| Filename | Description | Location | Dimensions | Type |
|---|---|---|---|---|
| `logo.svg` | Minimal square mark: two horizontal waveform bars in `#2F5B4C` stacked above one shorter bar in `#A4453A`, on transparent; geometric, flat, no text. Suggests "reference channel over relay hop". | Navbar, footer, favicon | 64×64 viewBox | SVG |
| `icon-drop.svg` | Line icon set (single file with symbols): `wave-upload`, `mic-record`, `folder-browse`, `x-remove`, `play-demo`, `check`, `alert-triangle`, `question`. 1.5px stroke, `currentColor`, rounded caps, 24×24 grid. | Dropzones, checklist, verdict cards | 24×24 grid | SVG |
| `paper-texture.png` | Very subtle warm paper grain texture, near-invisible at 100% opacity — meant to be tiled at low opacity (~0.35) over `paper` background. Fine fibrous speckle in `#EDE9E0` tones on transparent. | Global background layer (body::before) | 512×512 tile | Image |
| `method-diagram-relay.svg` | Flat diagram: handset → phone network (green node) → speakerphone icon radiating sound waves in a small room → second handset (red node) → network; thin 1.5px strokes, green/red on transparent, uppercase mono labels. Used to explain "second-hop relay". | Methodology hero | 1200×600 2:1 | SVG |
| `method-diagram-band.svg` | Flat frequency-band diagram: horizontal 0–8 kHz axis with the 300–3400 Hz telephone band shaded `green-tint`, dashed red edge lines at 300/3400, sub-band and above-band regions labeled in mono. | Methodology — channel thinness section | 1200×400 3:1 | SVG |
| `og-cover.png` | Social share card: cream background, wordmark top-left, a stylized green/red dual spectrogram strip across the middle, tagline bottom. Flat, print-like. | Site meta | 1200×630 | Image |

Note: all visualizer imagery (waveforms, spectrograms, bar charts) is rendered live on `<canvas>` from real audio — no pre-rendered chart images are needed.

---

## 9. Accessibility & Performance

- All canvas visualizers get `role="img"` and a full `aria-label` containing the numeric caption (e.g. the spectrogram energy readout).
- Verdict badge is never color-only: it always includes the uppercase text and a distinct icon (check / alert / question).
- Keyboard: dropzones are real buttons; radio cards are a real radiogroup; accordions use shadcn primitives.
- Performance: spectrograms render into offscreen canvases once per analysis; the scanline sweep animates a clipped reveal, not a recompute. Max ~8 simultaneously animating elements in any viewport.
