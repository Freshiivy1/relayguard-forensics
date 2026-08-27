import type { ReactNode } from 'react';
import SectionLabel from './SectionLabel';
import { useGsap, gsap, prefersReducedMotion } from './anim';
import { cn } from '@/lib/utils';
import { ProbeIcon } from '@/components/icons';
import {
  VoiceSparkFigure,
  BandDiagramFigure,
  RelayStateFigure,
  EnvelopeFigure,
  SmearFigure,
  NoiseRulerFigure,
  CorrelationGaugeFigure,
  ProbeBandFigure,
} from './SignalFigures';

interface Signal {
  index: string;
  name: string;
  weight: string | null; // null → diagnostic, no vote
  /** rendered next to the signal name (e.g. the probe glyph) */
  icon?: ReactNode;
  title: string;
  body: ReactNode[];
  callout: string;
  figure: ReactNode;
  figureLabel: string;
  wide?: boolean;
}

const SIGNALS: Signal[] = [
  {
    index: '01',
    name: 'Voice match',
    weight: '×0.6',
    title: 'Who is speaking — before asking how it was captured.',
    body: [
      <>
        Before asking <em>how</em> B was captured, we ask <em>who</em> is speaking. A{' '}
        <strong className="font-medium text-ink">5-matcher voice panel</strong> runs on VAD-gated
        speech of the channel-normalized audio: MFCC + deltas (13 coefficients + first deltas,
        long-term mean/std vector), a corpus-trained Fisher discriminant on the same vector, a
        root-based LPC formant signature (F1/F2/F3 from the polynomial roots of an order-12 LPC),
        pitch/F0 (autocorrelation median, semitone distance), and the long-term average spectrum
        (24 log-spaced bands, 200–3600 Hz). Each matcher's raw score passes through a{' '}
        <strong className="font-medium text-ink">shipped logistic calibration</strong> into a
        same-voice probability p, then votes{' '}
        <strong className="font-medium text-ink">SAME / DIFFERENT / ABSTAIN</strong> (p ≥ 0.60 /
        ≤ 0.40, abstain under 10 voiced frames).
      </>,
      <>
        The panel decides by strict consensus:{' '}
        <strong className="font-medium text-ink">≥3 SAME votes with 0 DIFFERENT establishes the
        same voice</strong>, and that consensus overrides the spectral-integrity flag veto:
        BASS_DEPLETED / SPEECH_THIN stay on display but no longer block a MATCH.{' '}
        <strong className="font-medium text-ink">≥3 DIFFERENT votes with 0 SAME vetoes any
        MATCH</strong> — the voices are not the same person regardless of channel similarity;
        the verdict becomes UNCERTAIN at minimum, or SUSPICIOUS RELAY when a relay/channel
        signal also fired. Anything else is no consensus and the weighted vote runs as before.
      </>,
      <>
        Calibration was trained offline on 33 male voices (VoxForge corpus + a field sample) and
        ships as constants — no network calls. Held-out metrics:{' '}
        <strong className="font-medium text-ink">clean pairs — 96/180 same-voice pairs detected,
        0.8% false-same; relay pairs — 0% false-same</strong>.
      </>,
      <>
        F0 statistics — median, p25/p75, voiced fraction, semitone distance, and a pitch-class
        label — act as a sanity check on the panel verdict.
      </>,
    ],
    callout:
      'Five calibrated matchers vote on who is speaking: a same-voice consensus settles identity even when the audio is thin — a different-voice consensus blocks any MATCH outright.',
    figure: <VoiceSparkFigure />,
    figureLabel: 'MFCC trajectory comparison',
  },
  {
    index: '02',
    name: 'Channel thinness',
    weight: '×1.0',
    title: 'The strongest vote: how much spectrum survived the path.',
    body: [
      <>
        Every telephony hop removes frequency content. A normal call already discards everything
        above ~3.6 kHz; a speakerphone relay adds the loudspeaker&rsquo;s limited bandwidth and a
        second encode.
      </>,
      <>
        We measure spectral centroid, p95/p99, energy below 300 Hz and above 3400/4000 Hz, and
        fuse them into a thinness score. B&rsquo;s thinness is compared to A&rsquo;s{' '}
        <strong className="font-medium text-ink">
          after both are normalized to the same baseline
        </strong>
        , with a per-mode margin before it counts as evidence — halved for strictness:{' '}
        <strong className="font-medium text-ink">0.03 Good / 0.05 Okay / 0.08 Poor</strong>.
      </>,
      <>
        On top of the margin, a strict <strong className="font-medium text-ink">spectral-integrity
        check</strong> (×0.75) works on VAD-gated speech frames only. It flags{' '}
        <code className="font-mono text-[13px]">BASS_DEPLETED</code> when B&rsquo;s speech loses
        ≥ 35% of its 80–300 Hz energy versus A (with at least a 0.5-point absolute drop) or falls
        under a 0.4% floor — on the Poor baseline the 300–500 Hz low-inband stands in, since the
        channel strips fundamentals. It flags{' '}
        <code className="font-mono text-[13px]">SPEECH_THIN</code> when B&rsquo;s speech p95 sits
        ≥ 12% below A&rsquo;s or its centroid ≥ 15% below. Any flag vetoes a clean MATCH: the
        verdict escalates to UNCERTAIN, or SUSPICIOUS RELAY when the channel vote also fired.
        The one exception is the voice panel — a 3/5+ same-voice consensus overrides the veto and
        the flags render as informational.
      </>,
      <>
        On the demo pair the shift is unambiguous: A&rsquo;s centroid sits at 717 Hz with 37.1%
        of energy below 300 Hz; relayed B jumps to a 2055 Hz centroid, keeps 94.6% of its energy
        inside the telephone band, and leaks 3.4% above 3.4 kHz from the loudspeaker.
      </>,
    ],
    callout:
      'A relayed clip holds nearly all its energy inside the 300–3400 Hz telephone band, with abnormal leakage above 3.4 kHz from the loudspeaker.',
    figure: <BandDiagramFigure />,
    figureLabel: 'Telephone band diagram, 0–8 kHz',
    wide: true,
  },
  {
    index: '03',
    name: 'Relay fingerprint',
    weight: '×0.5',
    title: 'A small CNN, trained on exactly this failure mode.',
    body: [
      <>
        A small convolutional network, bundled with the page, classifies per-clip spectrogram
        patches as direct-capture or relayed. Patch scores fuse to a per-clip relay score
        (0–1) with GREEN / AMBER / RED states.
      </>,
      <>
        Because the model runs entirely in the browser, its weights ship with the page — the
        same file you are reading now.
      </>,
    ],
    callout:
      'The model was trained on exactly this failure mode: room reverb plus loudspeaker coloration plus a second mu-law pass.',
    figure: <RelayStateFigure />,
    figureLabel: 'CNN relay score states',
  },
  {
    index: '04',
    name: 'Envelope dynamics',
    weight: '×0.5',
    title: 'The room never lets the audio go truly quiet.',
    body: [
      <>
        A loudspeaker and room compress the amplitude envelope: bursts merge, gaps fill in with
        reverb, and the duty cycle flattens. We measure speech duty cycle, burst count, burst
        coefficient of variation, gap depth in dB, and dynamic range.
      </>,
      <>
        Fewer than two bursts → the signal reports UNAVAILABLE and abstains from the vote. On
        the demo pair, direct A shows a 0.665 duty cycle across 14 bursts; relayed B fragments
        into 53 bursts at a 0.288 duty cycle.
      </>,
      <>
        The duty cycle <strong className="font-medium text-ink">flips sign in noise</strong>, so
        the vote checks the noise bed first: a <code className="font-mono text-[13px]">very_noisy</code>{' '}
        bed gates the duty cue out — it abstains rather than mislead. It is only trustworthy
        paired with a noise-bed measurement.
      </>,
    ],
    callout:
      'Relayed speech shows lower burst CV and shallower gaps — the room never lets the audio go truly quiet.',
    figure: <EnvelopeFigure />,
    figureLabel: 'Amplitude envelope comparison',
  },
  {
    index: '05',
    name: 'Spectral smear',
    weight: '×0.5',
    title: 'Reverberation blurs the spectral fingerprint.',
    body: [
      <>
        Room reverberation smears spectral structure. We measure spectral flatness on speech
        bursts and the gap-vs-burst dB difference; relay smear raises flatness and collapses the
        gap/burst contrast.
      </>,
    ],
    callout:
      'Direct capture of the demo speaker: flatness 0.0033. The same voice relayed over a speakerphone: 0.0224 — roughly 7× flatter.',
    figure: <SmearFigure />,
    figureLabel: 'Spectrum smear comparison, 40 bins',
  },
  {
    index: '06',
    name: 'Noise bed',
    weight: null,
    title: 'What the silence between words sounds like.',
    body: [
      <>
        The 20th-percentile frame level estimates the noise bed; SNR compares it to speech
        level. A relayed clip inherits the room&rsquo;s bed plus line noise from the second hop.
      </>,
      <>
        The noise bed is diagnostic context, not a vote: a loud room proves nothing about the
        capture path on its own, so it corroborates rather than convicts.
      </>,
    ],
    callout:
      "Labels: quiet / elevated / very_noisy. A 'very_noisy' bed on B with a 'quiet' bed on A is strong corroboration, never proof alone.",
    figure: <NoiseRulerFigure />,
    figureLabel: 'Noise-bed ruler, −90 to 0 dB',
  },
  {
    index: '07',
    name: 'Conversation cue',
    weight: '×0.5',
    title: 'Same conversation — or simply a different call?',
    body: [
      <>
        Do A and B contain the same conversation? We correlate the long-term average spectra
        (≥ 0.72 suggests shared content) and compare duty cycles and turn counts.
      </>,
      <>
        This guards against false alarms when B is simply a different call: thin audio that
        isn&rsquo;t the same conversation is not a relay, whatever the channel looks like.
      </>,
    ],
    callout:
      'High correlation with matching turn structure: same conversation, different capture path — exactly the relay scenario.',
    figure: <CorrelationGaugeFigure />,
    figureLabel: 'Long-term spectrum correlation gauge',
  },
  {
    index: '08',
    name: 'Active probe',
    weight: '×0.5',
    icon: <ProbeIcon className="h-4 w-4 text-amber-deep" />,
    title: 'Challenge noise: interrogate the path instead of just listening to it.',
    body: [
      <>
        When you record Audio B inside RelayGuard, the app can play a calibrated{' '}
        <strong className="font-medium text-ink">bass-free challenge noise</strong> through the
        device speaker while the microphone is open. The probe is a deterministic, seeded noise
        shaped into the 500 Hz–6 kHz band with a gentle 1–4 kHz presence lift — loud enough to
        interfere, quiet enough not to mask speech. No bass: the telephone channel strips
        everything under ~300 Hz anyway, so bass would only mask the conversation.
      </>,
      <>
        Because the generator is a pure function of its seed, the analyzer knows the exact
        spectrum it sent. It measures the probe-band smear on non-speech frames and correlates
        the received probe spectrum against the expected one (probe response fidelity, 0–1 with
        GREEN / AMBER / RED states). Field anchors: a speakerphone relay&rsquo;s noise bed sits just{' '}
        <strong className="font-medium text-ink">8.5 dB under the speech</strong> while a direct
        handset crushes it to ≈ −67 dBFS, and probe-band smear separates the two paths{' '}
        <strong className="font-medium text-ink">43×</strong> (0.1469 vs 0.0034) in a noisy room.
      </>,
      <>
        The probe votes at ×0.5 — only when a clip was actually recorded with challenge noise
        on; with the probe active the smear cue is weighted ×0.75 because the bed becomes
        deterministic. Probe off: every number falls back to the passive measurements above.
      </>,
    ],
    callout:
      'A room relay smears the probe: fidelity drops below 0.5 (RED) as reverb and far-mic DSP scramble the known shape. A direct path returns it intact.',
    figure: <ProbeBandFigure />,
    figureLabel: 'Probe band, 500 Hz–6 kHz · bass-free by design',
  },
];

function WeightChip({ weight }: { weight: string | null }) {
  if (weight) {
    return (
      <span className="rounded-full bg-green-tint px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-green-deep">
        Weight {weight}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-paper-edge px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
      Diagnostic · no vote
    </span>
  );
}

function SignalBlock({ s, flip }: { s: Signal; flip: boolean }) {
  const ref = useGsap<HTMLElement>((el) => {
    if (prefersReducedMotion()) return;
    const idx = el.querySelector('[data-idx]');
    const texts = el.querySelectorAll('[data-reveal]');
    const fig = el.querySelector('[data-wipe]');
    if (idx) gsap.set(idx, { opacity: 0, y: 20 });
    gsap.set(texts, { opacity: 0, y: 28 });
    if (fig) gsap.set(fig, { clipPath: 'inset(0% 100% 0% 0%)' });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 75%', once: true },
    });
    if (idx) tl.to(idx, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0);
    tl.to(texts, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }, 0.15);
    if (fig)
      tl.to(fig, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'power2.inOut' }, 0.4);
  });

  const text = (
    <div className={s.wide ? 'max-w-[760px]' : undefined}>
      <div className="flex items-baseline gap-4">
        <span
          data-idx
          className="font-mono text-[48px] leading-none tabular text-ink-faint"
          aria-hidden="true"
        >
          {s.index}
        </span>
        <div data-reveal className="flex flex-wrap items-center gap-3 pb-2">
          {s.icon}
          <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-green">
            {s.name}
          </span>
          <WeightChip weight={s.weight} />
          {s.index === '08' && (
            <span className="rounded-full bg-amber-tint px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-deep">
              When probe recorded
            </span>
          )}
        </div>
      </div>
      <h3 data-reveal className="mt-3 text-[18px] font-semibold text-ink md:text-[20px]">
        {s.title}
      </h3>
      {s.body.map((p, i) => (
        <p key={i} data-reveal className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          {p}
        </p>
      ))}
      <div data-reveal className="mt-5 border-l-2 border-red pl-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-red-deep">
          When relayed
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{s.callout}</p>
      </div>
    </div>
  );

  const figure = (
    <div data-wipe>
      <div className="rounded-[10px] border border-hairline bg-canvas-bg p-4">
        {s.figure}
      </div>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        {s.figureLabel}
      </p>
    </div>
  );

  if (s.wide) {
    // the strongest signal gets the largest block: full-width figure
    return (
      <section ref={ref} className="border-t border-hairline py-[72px] first:border-t-0">
        {text}
        <div className="mt-8">{figure}</div>
      </section>
    );
  }

  return (
    <section ref={ref} className="border-t border-hairline py-[72px] first:border-t-0">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={cn(flip && 'lg:order-2')}>{text}</div>
        <div className={cn(flip && 'lg:order-1')}>{figure}</div>
      </div>
    </section>
  );
}

export default function Signals() {
  const ref = useGsap<HTMLDivElement>((el) => {
    if (prefersReducedMotion()) return;
    const head = el.querySelectorAll(':scope > [data-reveal]');
    if (!head.length) return;
    gsap.set(head, { opacity: 0, y: 28 });
    gsap.to(head, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.09,
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
    });
  });
  return (
    <div ref={ref} className="mx-auto max-w-[1180px] px-6 py-20 md:py-24">
      <SectionLabel index="02">The signals</SectionLabel>
      <h2
        data-reveal
        className="mt-5 max-w-[680px] text-[28px] font-semibold leading-tight tracking-[-0.01em] text-ink md:text-[34px]"
      >
        Seven passive measurements, one fused score — plus an active probe.
      </h2>
      <p data-reveal className="mt-4 max-w-[680px] text-[15px] leading-relaxed text-ink-soft">
        No single measurement convicts a clip. Each signal below looks at a different physical
        trace of the capture path — and each can abstain when the audio gives it nothing to
        measure. Numbers quoted are measured from the bundled demo clips and field calibrations.
      </p>
      <div className="mt-6">
        {SIGNALS.map((s, i) => (
          <SignalBlock key={s.index} s={s} flip={!s.wide && i % 2 === 1} />
        ))}
      </div>
    </div>
  );
}
