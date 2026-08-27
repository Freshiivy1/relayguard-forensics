import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SectionLabel from './SectionLabel';
import { useGsap, gsap, prefersReducedMotion } from './anim';
import { cn } from '@/lib/utils';

// Worked example: the bundled demo pair (normal-direct A vs noisy-speakerphone B).
// vote 1 = "relay evidence", 0 = "consistent with A's channel"; fractional votes
// are a signal's normalized score. Score = Σ(vote·w) / Σw = 2.304 / 3.6 ≈ 0.64.
interface Segment {
  name: string;
  short: string;
  weight: number;
  vote: 'relay' | 'match';
  voteLabel: string;
  contribution: string; // share of final score (vote·w / Σw)
}

const SEGMENTS: Segment[] = [
  { name: 'Channel thinness', short: 'CHANNEL', weight: 1.0, vote: 'relay', voteLabel: 'RELAY · Δ 0.33', contribution: '0.278' },
  { name: 'Voice match', short: 'VOICE', weight: 0.6, vote: 'match', voteLabel: 'MATCH · 0.83', contribution: '0.000' },
  { name: 'Relay fingerprint', short: 'CNN', weight: 0.5, vote: 'relay', voteLabel: 'RELAY · 0.71', contribution: '0.099' },
  { name: 'Envelope dynamics', short: 'ENVELOPE', weight: 0.5, vote: 'relay', voteLabel: 'RELAY · 0.95', contribution: '0.132' },
  { name: 'Spectral smear', short: 'SMEAR', weight: 0.5, vote: 'relay', voteLabel: 'RELAY · 0.95', contribution: '0.132' },
  { name: 'Conversation cue', short: 'CONVO', weight: 0.5, vote: 'match', voteLabel: 'SAME CONVERSATION · 0.78', contribution: '0.000' },
];

const TOTAL_W = SEGMENTS.reduce((s, x) => s + x.weight, 0); // 3.6

const THRESHOLDS = [
  { label: 'MATCH', range: 'score ≤ 0.35', chip: 'bg-green-tint text-green-deep', dot: 'bg-green' },
  { label: 'UNCERTAIN', range: '0.35–0.6', chip: 'bg-amber-tint text-amber-deep', dot: 'bg-amber' },
  { label: 'SUSPICIOUS RELAY', range: 'score ≥ 0.6', chip: 'bg-red-tint text-red-deep', dot: 'bg-red' },
];

export default function Vote() {
  const [hover, setHover] = useState<number | null>(null);

  const ref = useGsap<HTMLElement>((el) => {
    if (prefersReducedMotion()) return;
    const head = el.querySelectorAll(':scope > [data-reveal]');
    const segs = el.querySelectorAll('[data-seg]');
    const chips = el.querySelectorAll('[data-chip]');
    const strip = el.querySelector('[data-strip]');
    gsap.set(head, { opacity: 0, y: 28 });
    gsap.set(segs, { scaleX: 0 });
    gsap.set(chips, { opacity: 0, scale: 0.9 });
    if (strip) gsap.set(strip, { opacity: 0, y: 12 });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el.querySelector('[data-card]'), start: 'top 78%', once: true },
    });
    tl.to(head, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.09 }, 0);
    // stacked bar draws segment-by-segment, left→right
    tl.to(segs, { scaleX: 1, duration: 0.45, ease: 'power2.out', stagger: 0.12 }, 0.2);
    // threshold chips pop after
    tl.to(chips, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.2)', stagger: 0.1 }, '-=0.15');
    if (strip) tl.to(strip, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, '-=0.1');
  });

  const hovered = hover !== null ? SEGMENTS[hover] : null;
  const hoverCenter =
    hover !== null
      ? (SEGMENTS.slice(0, hover).reduce((s, x) => s + x.weight, 0) + SEGMENTS[hover].weight / 2) /
        TOTAL_W
      : 0;

  return (
    <section ref={ref} className="mx-auto max-w-[1180px] px-6 py-20 md:py-24">
      <SectionLabel index="03">The vote</SectionLabel>
      <h2
        data-reveal
        className="mt-5 max-w-[640px] text-[28px] font-semibold leading-tight tracking-[-0.01em] text-ink md:text-[34px]"
      >
        A weighted vote, not a single test.
      </h2>

      <div
        data-card
        className="mx-auto mt-10 max-w-[860px] rounded-2xl border border-hairline bg-paper-deep p-6 md:p-8"
      >
        <h3 data-reveal className="text-[18px] font-semibold text-ink md:text-[20px]">
          Six votes, one score.
        </h3>
        <p data-reveal className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Segment width is the signal&rsquo;s weight; color is how it voted on the demo pair.
          Hover a segment for its contribution.
        </p>

        {/* stacked-bar diagram */}
        <div data-reveal className="relative mt-6">
          <AnimatePresence>
            {hovered && (
              <motion.div
                key="tip"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-none absolute -top-3 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-hairline bg-paper px-3 py-2 font-mono text-[11px] tabular text-ink"
                style={{ left: `${hoverCenter * 100}%` }}
              >
                {hovered.name} · weight ×{hovered.weight.toFixed(1)} · {hovered.voteLabel} ·
                contribution {hovered.contribution}
              </motion.div>
            )}
          </AnimatePresence>
          <div
            className="flex h-12 w-full overflow-hidden rounded-lg border border-hairline"
            role="img"
            aria-label="Stacked bar of weighted votes. Channel thinness, weight 1.0, votes relay. Voice match, weight 0.6, votes match. Relay fingerprint, envelope dynamics and spectral smear, weight 0.5 each, vote relay. Conversation cue, weight 0.5, votes match. Fused score 0.64."
          >
            {SEGMENTS.map((s, i) => (
              <div
                key={s.name}
                data-seg
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${s.name}, weight ${s.weight.toFixed(1)}, voted ${s.voteLabel}`}
                className={cn(
                  'flex origin-left items-center justify-center overflow-hidden border-r border-paper/60 font-mono text-[9px] uppercase tracking-[0.08em] text-paper outline-none last:border-r-0 md:text-[10px]',
                  s.vote === 'relay' ? 'bg-red' : 'bg-green',
                  hover === i && 'brightness-110',
                )}
                style={{ width: `${(s.weight / TOTAL_W) * 100}%` }}
              >
                <span className="hidden px-1 sm:inline">
                  {s.short} ×{s.weight.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* formula */}
        <p
          data-reveal
          className="mt-8 text-center font-mono text-[13px] tabular text-ink md:text-[14px]"
        >
          score = Σ(vote
          <sub className="text-[9px]">i</sub> × weight
          <sub className="text-[9px]">i</sub>) / Σ(weight
          <sub className="text-[9px]">i</sub>)
        </p>

        {/* verdict thresholds */}
        <div data-reveal className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {THRESHOLDS.map((t) => (
            <span
              key={t.label}
              data-chip
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em]',
                t.chip,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} aria-hidden="true" />
              {t.label} · {t.range}
            </span>
          ))}
        </div>

        <p data-reveal className="mt-5 text-center text-[13px] leading-relaxed text-ink-soft">
          UNAVAILABLE signals abstain and their weight is removed from the denominator.
          Confidence scales with the distance of the score from the nearest threshold and with
          the number of agreeing signals.
        </p>

        {/* worked example */}
        <div data-strip className="mt-8 border-t border-hairline pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Worked example · demo pair: normal-direct → noisy-speakerphone
          </p>
          <p className="mt-2 font-mono text-[12px] leading-relaxed tabular text-ink-soft">
            voice 0.83×0.6 + channel 0.33Δ×1.0 + relay 0.71×0.5 + envelope ×0.5 + smear ×0.5 +
            conversation 0.78×0.5 <span className="text-ink">→ 0.64</span>{' '}
            <span className="font-medium text-red-deep">→ SUSPICIOUS RELAY · 78%</span>
          </p>
        </div>
      </div>
    </section>
  );
}
