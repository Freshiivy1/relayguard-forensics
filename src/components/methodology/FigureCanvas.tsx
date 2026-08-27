import { useEffect, useRef } from 'react';
import { setupCanvas } from '@/lib/audio/render';
import type { CanvasCtx } from '@/lib/audio/render';
import { cn } from '@/lib/utils';

interface Props {
  draw: (c: CanvasCtx) => void;
  height: number;
  ariaLabel: string;
  className?: string;
}

/**
 * DPR-aware canvas panel for the signal figures. Re-draws on resize.
 * The plot fills the element; styling (hairline frame, paper bg) lives on the
 * wrapper so the canvas itself stays a pure drawing surface.
 */
export default function FigureCanvas({ draw, height, ariaLabel, className }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);

  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    if (!wrap || !cv) return;
    const render = () => {
      const c = setupCanvas(cv);
      if (c) drawRef.current(c);
    };
    render();
    const ro = new ResizeObserver(render);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={cn('w-full', className)}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        style={{ width: '100%', height, display: 'block' }}
      />
    </div>
  );
}
