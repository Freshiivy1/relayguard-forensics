import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { setupCanvas, drawBandChart } from '@/lib/audio/render';
import type { ChannelSignal } from '@/lib/audio/compare';
import { useElementSize, useInViewOnce, prefersReducedMotion } from './useElementSize';

interface Props {
  channel: ChannelSignal;
  baselineLabel: string;
  sweepKey: number;
}

export default function BandChartPanel(props: Props) {
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const [viewRef, inView] = useInViewOnce<HTMLDivElement>(0.3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const setRefs = (el: HTMLDivElement | null) => {
    (wrapRef as { current: HTMLDivElement | null }).current = el;
    (viewRef as { current: HTMLDivElement | null }).current = el;
  };

  const ch = props.channel;

  const draw = (reveal: number) => {
    const canvas = canvasRef.current;
    if (!canvas || size.width < 10) return;
    const c = setupCanvas(canvas);
    if (!c) return;
    drawBandChart(c, {
      a: { sub300: ch.sub300A, inband: ch.inbandA, above3400: ch.above3400A, above4000: ch.above4000A },
      b: { sub300: ch.sub300B, inband: ch.inbandB, above3400: ch.above3400B, above4000: ch.above4000B },
      reveal,
    });
  };

  useEffect(() => {
    if (!inView || size.width < 10) return;
    if (prefersReducedMotion()) {
      draw(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      draw(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, size.width, ch, props.sweepKey]);

  const inbandA = (ch.inbandA * 100).toFixed(1);
  const inbandB = (ch.inbandB * 100).toFixed(1);
  const conclusion = ch.bThinnerThanA
    ? `B holds ${inbandB}% of its energy in-band vs A's ${inbandA}% — after normalizing for the ${props.baselineLabel} baseline, B is measurably thinner than A (delta ${ch.delta.toFixed(2)} vs ${ch.margin.toFixed(2)} margin).`
    : `B holds ${inbandB}% of its energy in-band vs A's ${inbandA}% — after normalizing for the ${props.baselineLabel} baseline, B is NOT measurably thinner than A (delta ${ch.delta.toFixed(2)} within the ${ch.margin.toFixed(2)} margin).`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.55 }}
      className="rounded-2xl border border-hairline bg-paper-deep p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          Band-energy fingerprint
        </p>
        <span className="rounded-full bg-amber-tint px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-amber-deep">
          Thinness proof
        </span>
      </div>
      <div className="mx-auto max-w-[720px]">
        <div
          ref={setRefs}
          className="h-[300px] w-full overflow-hidden rounded-[10px] border border-hairline"
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
            role="img"
            aria-label={`Band energy chart. A in-band ${inbandA} percent, B in-band ${inbandB} percent. ${conclusion}`}
          />
        </div>
        <div className="mt-2 flex justify-center gap-6 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green" /> Audio A
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red" /> Audio B
          </span>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">{conclusion}</p>
      </div>
    </motion.div>
  );
}
