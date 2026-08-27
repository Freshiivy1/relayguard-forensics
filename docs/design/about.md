# Page: About & Limitations — `about.md`

The honest fine print: what a RelayGuard verdict does and does not mean, the privacy model, known failure modes, and responsible-use guidance. Tone: plain-spoken, credible, never legalistic. Visually it is the quietest page — long-form text, cards, and one accordion — with the same instrument aesthetic.

---

## S1. Hero
**Layout:** content column (max 760px), padding 96px top / 48px bottom.

- Eyebrow: `ABOUT & LIMITATIONS` (uppercase micro, green, 24px rule).
- H1 (48px): "Forensic cues, not proof."
- Lead (18px, `ink-soft`):
  > "RelayGuard is a measuring instrument. It reports whether a comparison clip carries the acoustic fingerprints of a second-hop speakerphone relay, relative to a reference clip and an expected channel baseline. It does not identify people, it does not detect lies, and it does not testify. Everything it computes is visible to you, number by number, on the results page."

**Animation:** eyebrow + H1 + lead rise 32px, stagger 0.1s on load.

---

## S2. What a verdict means
**Layout:** three cards in a row (stack on mobile), each topped by its verdict badge (same badge component as the home page, 20px size) + a 14px explanation.

1. `MATCH` (green-tint) — "B is consistent with A's channel after normalization. No measurable second-hop degradation. This means *no relay was detected* — not that none existed."
2. `SUSPICIOUS RELAY` (red-tint) — "B shows additional degradation beyond the expected baseline, across multiple independent signals. This is corroborating evidence of a relay hop, not a determination of intent."
3. `UNCERTAIN` (amber-tint) — "The signals disagree, or the clips are too short, too noisy, or too dissimilar to support a call. Treat the evidence readout, not the badge, as the result."

**Animation:** cards stagger 0.1s, rise 28px; badges pop (scale 0.92→1 spring) as each card lands. Trigger at 25% viewport.

---

## S3. Known limitations
**Layout:** section label `KNOWN LIMITATIONS`; a numbered list of six limitation rows, each a hairline-separated block with a mono index, a bold 16px title, and 14–15px body text. No cards — an open document feel.

1. **Both clips can be relayed.** If A itself passed through a speakerphone, thinness is measured relative to an already-degraded reference. The relay detector and noise bed still run per-clip, but the channel vote weakens.
2. **Poor mode compresses the evidence.** On a 300–3400 Hz prison-phone baseline both clips are expected to be thin; the channel signal's margin widens (0.16) and more weight effectively falls on voice, envelope, and smear.
3. **Short clips abstain.** Under two speech bursts, envelope dynamics reports UNAVAILABLE and contributes no vote; very short clips also weaken the conversation cue. Confidence is reduced accordingly.
4. **Same-device trickery.** A high-quality speakerphone in an anechoic room can produce a mild fingerprint; a noisy direct capture can mimic a mild one. Borderline cases land in UNCERTAIN by design.
5. **It is not a speaker identifier.** Voice match is a consistency check across the two clips (score 0–1), tuned to ignore channel differences — it cannot and does not name a person.
6. **Codec and dataset drift.** The relay detector was trained on common telephony chains (8 kHz mu-law, AMR-family codecs). Novel codecs or AI-vocoder pipelines may fall outside its calibration.

**Animation:** rows rise 20px, stagger 0.07s, trigger at 25% viewport; index numbers count from 00 in mono as each row lands.

---

## S4. Privacy model
**Layout:** section label `PRIVACY`; a two-column split — left text, right a compact checklist card (same component as home S5).

Text (16px, `ink-soft`):
> "There is no server. Audio is decoded in a sandboxed tab, resampled in memory, analyzed by bundled models, and discarded when you close or reload the page. The only network requests this app ever makes are for its own static files — fonts, model weights, and the four demo clips. You can verify this in your browser's network inspector: after the page loads, analysis produces zero requests."

Checklist card rows (green check + label + right mono status):
- `Audio upload to any server` — `NEVER`
- `Analysis network requests` — `0`
- `Cookies / tracking` — `NONE`
- `Model weights` — `BUNDLED · HTTP 200`
- `Works offline after load` — `YES`

**Animation:** text rises 24px; checklist rows stagger 0.07s with check-draw (stroke-dashoffset 400ms). Trigger at 25% viewport.

---

## S5. Responsible use
**Layout:** section label `RESPONSIBLE USE`; a single wide card with a 2px amber left border (not red — caution, not alarm), padding 24px.

Body (15px, `ink-soft`):
> "Do not present a RelayGuard verdict as evidence of wrongdoing on its own. Acoustic relay fingerprints indicate a capture path, not a motive. Recordings may be subject to consent laws in your jurisdiction — analyze only audio you are entitled to possess. If a result matters, corroborate it: the signal-by-signal readout exists precisely so a human can audit the machine."

**Animation:** card rises 24px, amber border draws top→bottom (400ms). Trigger at 30% viewport.

---

## S6. FAQ (accordion)
**Layout:** section label `QUESTIONS`; a max-860px centered accordion (shadcn, hairline separators, 18px question / 15px answer in `ink-soft`).

1. **"Why does the comparison depend on the baseline I choose?"** — Because 'thin' is relative. Energy above 3.4 kHz is damning against a Good baseline, meaningless against a Poor one. Pick the channel the reference call was actually captured on.
2. **"Can I use two clips from different calls?"** — You can, but the voice match and conversation cue will (correctly) vote that the clips are unrelated, pushing toward UNCERTAIN.
3. **"What does the interval scan add?"** — It re-runs the relay detector over sliding windows of B. A relay that is only present for part of the clip shows up as RED windows in an otherwise GREEN timeline.
4. **"Why do the spectrograms stop at 4 kHz?"** — Telephony lives below 4 kHz. Everything the channel and relay signals measure happens in that band, so the display spends its resolution where the evidence is.
5. **"Can I export the evidence?"** — The evidence readout is plain numbers on the page; screenshot it or copy the values freely. (Optional implementation nicety: a `Copy evidence JSON` ghost button in the toolbar.)

**Animation:** accordion items stagger 0.06s on scroll-in; expansion uses the shared height spring (stiffness 300, damping 30).

---

## S7. CTA band
**Layout:** centered, padding 96px 0, hairline top. Instrument Serif italic line (26px): "Trust the numbers. Then check them." + primary button `Open the analyzer` → `/`.

**Animation:** quote + button rise 20px, stagger 0.15s.

## Page assets used
- `logo.svg`, `icon-drop.svg` (check/alert/question icons), `paper-texture.png`. No photography — this page is deliberately text-and-instrument only.
