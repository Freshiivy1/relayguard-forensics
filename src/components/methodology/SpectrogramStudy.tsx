// S5 — "Reading the spectrograms": annotated canvas mock of the relayed demo
// clip (noisy-speakerphone) with the signature scanline sweep, four numbered
// callout pins, and a sticky step column. Canvas sweep is a plain rAF loop;
// pins are Framer Motion leaf components. No GSAP inside this tree.
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import SectionLabel from './SectionLabel';
import { useGsap, prefersReducedMotion, riseReveal } from './anim';
import {
  setupCanvas,
  drawSpectrogram,
  renderSpectrogramImage,
  spectrogramGeometry,
} from '@/lib/audio/render';
import type { Spectrogram } from '@/lib/audio/stft';
import { cn } from '@/lib/utils';

const PANEL_H = 420;
const MAX_HZ = 4000;
const CAPTION =
  '95% of spectral energy lies below 2 859 Hz, with 94.6% of energy inside the 300–3400 Hz telephone band and 3.4% above 3.4 kHz.';

/** Deterministic synthetic spectrogram that looks like the relayed demo clip:
 *  energy confined to the telephone band, hot sibilant hash above 3.4 kHz,
 *  and gaps that stay grey instead of going quiet. */
function synthRelaySpectrogram(): Spectrogram {
  const fftSize = 1024;
  const bins = fftSize / 2 + 1;
  const sampleRate = 16000;
  const hop = 512;
  const frames = 260;
  const binHz = sampleRate / 2 / (bins - 1);
  let seed = 1234;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const power: Float32Array[] = [];
  for (let f = 0; f < frames; f++) {
    const t = f / frames;
    const phase = (t * 9) % 1; // ~9 speech bursts over the clip
    const on = phase < 0.6;
    const env = Math.sin(Math.PI * Math.min(1, phase / 0.6));
    const row = new Float32Array(bins);
    for (let b = 0; b < bins; b++) {
      const hz = b * binHz;
      let v = 0;
      // raised room bed across the band (relay never goes quiet)
      if (hz > 200 && hz < 3600) v += 1.2e-6 * (0.6 + 0.4 * rand());
      if (on && hz > 280 && hz < 3400) {
        // harmonic stack with formant weighting
        let s = 0;
        for (let h = 2; h * 140 < 3400; h++) {
          const hh = h * 140;
          const d = (hz - hh) / 34;
          s += Math.exp(-d * d) / Math.pow(h, 0.8);
        }
        const formants =
          0.45 +
          1.1 * Math.exp(-Math.pow((hz - 850) / 480, 2)) +
          0.8 * Math.exp(-Math.pow((hz - 2400) / 620, 2));
        v += s * formants * env * env * 6e-3 * (0.65 + 0.7 * rand());
      }
      // loudspeaker sibilant hash above 3.4 kHz
      if (on && hz >= 3400) {
        v += rand() * rand() * 1.6e-4 * env * (hz < 4200 ? 1 : 0.3);
      }
      // reverb fill between bursts: grey valleys
      if (!on && hz > 280 && hz < 3500) {
        v += 5e-6 * (0.5 + 0.5 * rand());
      }
      row[b] = v;
    }
    power.push(row);
  }
  return { power, frames, bins, sampleRate, fftSize, hop };
}

const STEPS = [
  <>
    The dashed red lines are the telephone band edges — 300 Hz and 3 400 Hz. Energy hugging the
    band means telephony; energy far above it means a cleaner channel.
  </>,
  <>
    Dark density is energy. A relayed clip looks <em>thinner and busier</em>: less low body
    below 300 Hz, hot sibilant hash above 3.4 kHz from the loudspeaker.
  </>,
  <>
    Look at the gaps. Direct speech goes pale between bursts; relayed speech stays grey —
    reverb and room noise fill the valleys.
  </>,
  <>
    Compare the captions: &lsquo;95% of spectral energy lies below…&rsquo; plus the in-band and
    above-band percentages are the numbers behind the thinness vote.
  </>,
];

// pin anchors as fractions of the figure wrapper (canvas + caption)
const PINS = [
  { left: '14%', top: '12%', label: 'Telephone band edges at 300 Hz and 3.4 kHz' },
  { left: '55%', top: '5%', label: 'Hot sibilant hash above 3.4 kHz from the loudspeaker' },
  { left: '71%', top: '38%', label: 'A gap between bursts that stays grey with reverb' },
  { left: '5%', top: '93%', label: 'Caption strip with the energy readout' },
];

function AnnotatedSpectrogram({
  active,
  onActive,
}: {
  active: number | null;
  onActive: (i: number | null) => void;
}) {
  const reduced = useReducedMotion() ?? prefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef({ reveal: reduced ? 1 : 0, edges: reduced ? 1 : 0 });
  const [swept, setSwept] = useState(reduced);

  const spec = useMemo(() => synthRelaySpectrogram(), []);
  const duration = (spec.frames * spec.hop) / spec.sampleRate;

  const redraw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const c = setupCanvas(canvas);
    if (!c) return;
    const geom = spectrogramGeometry(c.width, PANEL_H, duration, MAX_HZ);
    drawSpectrogram(c, img, geom, {
      reveal: animRef.current.reveal,
      scanline: true,
      drawEdges: true,
      edgeProgress: animRef.current.edges,
    });
  };

  // build offscreen image + observe resize
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rebuild = () => {
      const w = wrap.getBoundingClientRect().width;
      if (w < 10) return;
      const geom = spectrogramGeometry(w, PANEL_H, duration, MAX_HZ);
      imgRef.current = renderSpectrogramImage(spec, geom.plotW, geom.plotH, MAX_HZ);
      redraw();
    };
    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, duration]);

  // scanline sweep once when scrolled into view (30% viewport)
  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || !imgRef.current) return;
        io.disconnect();
        const t0 = performance.now();
        const SWEEP = 1200;
        const EDGES = 600;
        const tick = (now: number) => {
          const el = now - t0;
          const p = Math.min(1, el / SWEEP);
          // ease-in-out
          animRef.current.reveal = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          animRef.current.edges = Math.min(1, Math.max(0, (el - SWEEP) / EDGES));
          redraw();
          if (el < SWEEP + EDGES) raf = requestAnimationFrame(tick);
          else setSwept(true);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    io.observe(wrap);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative rounded-[10px] border border-hairline bg-canvas-bg"
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Annotated spectrogram of the relayed demo clip, 0 to 4 kHz. ${CAPTION}`}
          style={{ width: '100%', height: PANEL_H, display: 'block' }}
        />
        {/* caption strip */}
        <div className="border-t border-hairline px-4 py-3">
          <p className="font-mono text-[12px] leading-relaxed tabular text-ink-soft">
            {CAPTION}
          </p>
        </div>
        {/* callout pins */}
        {PINS.map((p, i) => (
          <motion.button
            key={i}
            type="button"
            aria-label={`Callout ${i + 1}: ${p.label}`}
            onMouseEnter={() => onActive(i)}
            onMouseLeave={() => onActive(null)}
            onFocus={() => onActive(i)}
            onBlur={() => onActive(null)}
            initial={reduced ? false : { scale: 0.6, opacity: 0 }}
            animate={swept ? { scale: 1, opacity: 1 } : undefined}
            transition={
              reduced
                ? { duration: 0 }
                : { delay: 0.15 + i * 0.15, type: 'spring', stiffness: 320, damping: 16 }
            }
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'absolute z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-mono text-[10px] tabular text-paper outline-none',
              active === i ? 'bg-green-deep ring-2 ring-green/40' : 'bg-green',
            )}
            style={{ left: p.left, top: p.top }}
          >
            {i + 1}
          </motion.button>
        ))}
      </div>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        Spectrogram · Audio B · noisy-speakerphone (synthetic mock of the measured render)
      </p>
    </div>
  );
}

export default function SpectrogramStudy() {
  const [active, setActive] = useState<number | null>(null);
  const ref = useGsap<HTMLElement>((el) => riseReveal(el, { start: 'top 78%' }));

  return (
    <section ref={ref} className="mx-auto max-w-[1180px] px-6 py-20 md:py-24">
      <SectionLabel index="04">Reading the evidence</SectionLabel>
      <h2
        data-reveal
        className="mt-5 max-w-[640px] text-[28px] font-semibold leading-tight tracking-[-0.01em] text-ink md:text-[34px]"
      >
        Reading the spectrograms.
      </h2>

      <div className="mt-12 grid items-start gap-12 lg:grid-cols-[2fr_3fr]">
        {/* sticky step column */}
        <div className="self-start lg:sticky lg:top-24">
          <ol className="space-y-7">
            {STEPS.map((s, i) => (
              <li key={i} data-reveal className="flex gap-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] tabular transition-colors',
                    active === i ? 'bg-green text-paper' : 'bg-paper-edge text-ink-soft',
                  )}
                >
                  {i + 1}
                </span>
                <p
                  className={cn(
                    'text-[15px] leading-relaxed decoration-green decoration-2 underline-offset-[6px] transition-colors',
                    active === i ? 'text-ink underline' : 'text-ink-soft',
                  )}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                >
                  {s}
                </p>
              </li>
            ))}
          </ol>
          <p data-reveal className="mt-8 font-serif text-[20px] italic leading-snug text-ink-soft">
            &ldquo;The spectrogram is the crime-scene photograph; the signals are the lab
            measurements taken from it.&rdquo;
          </p>
        </div>

        {/* annotated figure */}
        <div data-reveal>
          <AnnotatedSpectrogram active={active} onActive={setActive} />
        </div>
      </div>
    </section>
  );
}
