import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { setupCanvas, drawScanStrip, type ScanCell } from '@/lib/audio/render';
import { useElementSize } from './useElementSize';

interface Props {
  cells: ScanCell[];
  duration: number;
}

export default function ScanStrip({ cells, duration }: Props) {
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [tipX, setTipX] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width < 10) return;
    const c = setupCanvas(canvas);
    if (!c) return;
    drawScanStrip(c, cells, duration, hover);
  }, [cells, duration, hover, size.width]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    const idx = cells.findIndex((c) => t >= c.start_s && t < c.end_s);
    setHover(idx >= 0 ? idx : null);
    setTipX(e.clientX - rect.left);
  };

  const cell = hover !== null ? cells[hover] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.55 }}
      className="rounded-2xl border border-hairline bg-paper-deep p-5"
    >
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
        Interval scan — Audio B
      </p>
      <div
        ref={wrapRef}
        className="relative h-[120px] w-full overflow-hidden rounded-[10px] border border-hairline"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          role="img"
          aria-label={`Interval scan of Audio B into ${cells.length} windows`}
        />
        {cell && (
          <div
            className="pointer-events-none absolute top-1.5 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 font-mono text-[10px] text-paper"
            style={{ left: Math.min(Math.max(tipX, 110), Math.max(110, size.width - 110)) }}
          >
            {cell.start_s.toFixed(1)}–{cell.end_s.toFixed(1)} s · relay score {cell.score.toFixed(2)} ({cell.state})
          </div>
        )}
      </div>
      <p className="mt-3 border-t border-hairline pt-3 font-mono text-[12px] text-ink-soft">
        Windows scoring RED suggest the relay hop is intermittent — present only in part of the clip.
      </p>
    </motion.div>
  );
}
