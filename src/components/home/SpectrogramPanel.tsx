import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { stft } from '@/lib/audio/stft';
import {
  setupCanvas,
  drawSpectrogram,
  renderSpectrogramImage,
  spectrogramGeometry,
  COLORS,
} from '@/lib/audio/render';
import type { ClipProfile } from '@/lib/audio/features';
import { useElementSize, useInViewOnce, prefersReducedMotion } from './useElementSize';

interface Props {
  eyebrow: string;
  samples: Float32Array;
  sampleRate: number;
  profile: ClipProfile;
  accent: 'A' | 'B';
  sweepKey: number;
  /** low band watched by the spectral-integrity check (Hz) */
  lowBandHz: [number, number];
  /** true when this clip's spectral-integrity flag fired (B only) */
  flagged: boolean;
}

const MAX_HZ = 4000;
const PANEL_H = 420;
// mirror of spectrogramGeometry padding, for positioning the readout chip
const PAD_T = 12;
const PAD_B = 28;
const PAD_L = 44;

export default function SpectrogramPanel(props: Props) {
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const [viewRef, inView] = useInViewOnce<HTMLDivElement>(0.3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLCanvasElement | null>(null);
  const crossRef = useRef<{ t: number; f: number } | null>(null);
  const animRef = useRef({ reveal: 1, edges: 1 });

  const setRefs = (el: HTMLDivElement | null) => {
    (wrapRef as { current: HTMLDivElement | null }).current = el;
    (viewRef as { current: HTMLDivElement | null }).current = el;
  };

  const spec = useMemo(
    () => (props.samples.length > 2048 ? stft(props.samples, props.sampleRate) : null),
    [props.samples, props.sampleRate],
  );

  const duration = props.samples.length / props.sampleRate;

  const redraw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || size.width < 10) return;
    const c = setupCanvas(canvas);
    if (!c) return;
    const geom = spectrogramGeometry(size.width, PANEL_H, duration, MAX_HZ);
    drawSpectrogram(c, img, geom, {
      reveal: animRef.current.reveal,
      scanline: true,
      drawEdges: true,
      edgeProgress: animRef.current.edges,
      crosshair: crossRef.current,
      lowBand: { loHz: props.lowBandHz[0], hiHz: props.lowBandHz[1], flagged: props.flagged },
    });
  };

  // build offscreen image when spec / size changes
  useEffect(() => {
    if (!spec || size.width < 10) return;
    const geom = spectrogramGeometry(size.width, PANEL_H, duration, MAX_HZ);
    imgRef.current = renderSpectrogramImage(spec, geom.plotW, geom.plotH, MAX_HZ);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, size.width]);

  // scanline sweep when scrolled into view or re-run
  useEffect(() => {
    if (!inView || !imgRef.current) return;
    if (prefersReducedMotion()) {
      animRef.current = { reveal: 1, edges: 1 };
      redraw();
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const sweepDur = 1200;
    const edgeDur = 400;
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const rt = Math.min(1, (now - t0) / sweepDur);
      // ease-in-out
      const reveal = rt < 0.5 ? 2 * rt * rt : 1 - Math.pow(-2 * rt + 2, 2) / 2;
      const edges = Math.max(0, Math.min(1, (t * 1000 - sweepDur) / edgeDur));
      animRef.current = { reveal, edges };
      redraw();
      if (rt < 1 || edges < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, props.sweepKey, spec, size.width]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const geom = spectrogramGeometry(rect.width, PANEL_H, duration, MAX_HZ);
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < geom.padL || x > geom.padL + geom.plotW || y < geom.padT || y > geom.padT + geom.plotH) {
      if (crossRef.current) {
        crossRef.current = null;
        redraw();
      }
      return;
    }
    crossRef.current = {
      t: ((x - geom.padL) / geom.plotW) * duration,
      f: (1 - (y - geom.padT) / geom.plotH) * MAX_HZ,
    };
    redraw();
  };

  const p = props.profile;

  // low-band readout chip: measured speech low-band energy for this clip
  const [loHz, hiHz] = props.lowBandHz;
  const lowFrac = loHz <= 80 ? p.speech.lowBand : p.speech.lowInband;
  const chipOk = Number.isFinite(lowFrac);
  const midHz = (loHz + hiHz) / 2;
  const chipTop = PAD_T + (PANEL_H - PAD_T - PAD_B) * (1 - midHz / MAX_HZ);
  const caption = `95% of spectral energy lies below ${Math.round(p.p95Hz).toLocaleString('en-US').replace(/,/g, ' ')} Hz, with ${(p.bands.inband * 100).toFixed(1)}% of energy inside the 300–3400 Hz telephone band and ${(p.bands.above3400 * 100).toFixed(1)}% above 3.4 kHz.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.55 }}
      className={`rounded-2xl border border-hairline bg-paper-deep p-5 ${
        props.accent === 'B' ? 'border-t-2 border-t-red' : ''
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          {props.eyebrow}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            Energy
          </span>
          <span
            className="inline-block h-[10px] w-[80px] rounded-sm border border-hairline"
            style={{
              background: `linear-gradient(to right, ${COLORS.paperDeep}, ${COLORS.green}, ${COLORS.ink})`,
            }}
          />
        </div>
      </div>
      <div
        ref={setRefs}
        className="relative w-full cursor-crosshair overflow-hidden rounded-[10px] border border-hairline"
        style={{ height: PANEL_H }}
        onMouseMove={onMove}
        onMouseLeave={() => {
          crossRef.current = null;
          redraw();
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          role="img"
          aria-label={`Spectrogram ${props.accent}: ${caption}`}
        />
        {/* low-band readout chip, vertically centered on the watched zone */}
        <span
          className={`pointer-events-none absolute z-10 -translate-y-1/2 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] tabular ${
            props.flagged
              ? 'border-red bg-red-tint text-red-deep'
              : 'border-amber bg-amber-tint text-amber-deep'
          }`}
          style={{ top: chipTop, left: PAD_L + 8 }}
        >
          {loHz}–{hiHz} Hz ·{' '}
          {chipOk ? `${(lowFrac * 100).toFixed(1)}% of speech energy` : 'n/a — too few speech frames'}
          {props.flagged ? ' · ⚑ THIN' : ''}
        </span>
      </div>
      <p className="mt-3 border-t border-hairline pt-3 font-mono text-[12px] leading-relaxed text-ink-soft tabular">
        {caption}
      </p>
    </motion.div>
  );
}
