import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { setupCanvas, drawWaveform, COLORS } from '@/lib/audio/render';
import type { SpeechTurn } from '@/lib/audio/vad';
import { useElementSize, useInViewOnce, prefersReducedMotion } from './useElementSize';

interface Props {
  eyebrow: string;
  badge: string;
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  color: string;
  turnTint: string;
  turns: SpeechTurn[];
  revealKey: number;
}

export default function WaveformPanel(props: Props) {
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const [viewRef, inView] = useInViewOnce<HTMLDivElement>(0.25);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; text: string } | null>(null);
  const [ready, setReady] = useState(false);

  const setRefs = (el: HTMLDivElement | null) => {
    (wrapRef as { current: HTMLDivElement | null }).current = el;
    (viewRef as { current: HTMLDivElement | null }).current = el;
  };

  // draw helper
  const draw = (reveal: number) => {
    const canvas = canvasRef.current;
    if (!canvas || size.width < 10) return;
    const c = setupCanvas(canvas);
    if (!c) return;
    drawWaveform(c, props.samples, props.sampleRate, {
      color: props.color,
      duration: props.duration,
      turns: props.turns,
      turnTint: props.turnTint,
      reveal,
    });
  };

  // wipe animation when in view / on re-run
  useEffect(() => {
    if (!inView || size.width < 10) return;
    if (prefersReducedMotion()) {
      draw(1);
      setReady(true);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      draw(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setReady(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, size.width, props.samples, props.revealKey]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ready || props.turns.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = (x / rect.width) * props.duration;
    const idx = props.turns.findIndex((s) => t >= s.start_s && t <= s.end_s);
    if (idx >= 0) {
      const s = props.turns[idx];
      setTooltip({
        x,
        text: `speech turn ${idx + 1} · ${s.start_s.toFixed(1)} s → ${s.end_s.toFixed(1)} s`,
      });
    } else setTooltip(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-hairline bg-paper-deep p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          {props.eyebrow}
        </p>
        <span className="rounded-full bg-green-tint px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-green-deep">
          {props.badge}
        </span>
      </div>
      <div
        ref={setRefs}
        className="relative h-[160px] w-full overflow-hidden rounded-[10px] border border-hairline"
        onMouseMove={onMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          role="img"
          aria-label={`Waveform of ${props.eyebrow}, duration ${props.duration.toFixed(1)} seconds`}
        />
        {tooltip && (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-md bg-ink px-2 py-1 font-mono text-[10px] text-paper"
            style={{ left: Math.min(Math.max(tooltip.x, 90), size.width - 90) }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export const WAVEFORM_COLORS = {
  A: { color: COLORS.green, tint: 'rgba(47, 91, 76, 0.06)' },
  B: { color: COLORS.red, tint: 'rgba(164, 69, 58, 0.06)' },
};
