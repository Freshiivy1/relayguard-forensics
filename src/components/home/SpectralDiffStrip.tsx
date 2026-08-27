import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { setupCanvas, drawSpectrumDiff, type SpectrumDiffBand } from '@/lib/audio/render';
import type { SpectralIntegritySignal } from '@/lib/audio/compare';
import type { ClipProfile } from '@/lib/audio/features';
import { useElementSize, useInViewOnce, prefersReducedMotion } from './useElementSize';

interface Props {
  a: ClipProfile;
  b: ClipProfile;
  integrity: SpectralIntegritySignal;
  sweepKey: number;
}

const STRIP_H = 96;
const BIN_HZ = 200;
const MAX_HZ = 4000;

/**
 * A−B speech spectrum difference strip: per-200 Hz band heat cells of
 * meanSpectrum(A) − meanSpectrum(B) on VAD-gated speech frames. Dips (red) in
 * the low band are the thinness signature.
 */
export default function SpectralDiffStrip(props: Props) {
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const [viewRef, inView] = useInViewOnce<HTMLDivElement>(0.3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const setRefs = (el: HTMLDivElement | null) => {
    (wrapRef as { current: HTMLDivElement | null }).current = el;
    (viewRef as { current: HTMLDivElement | null }).current = el;
  };

  const available = props.integrity.available;

  const bands = useMemo<SpectrumDiffBand[]>(() => {
    const out: SpectrumDiffBand[] = [];
    if (!available) return out;
    const specA = props.a.speech.meanSpectrum;
    const specB = props.b.speech.meanSpectrum;
    const binHz = props.a.sampleRate / 2 / (specA.length - 1);
    for (let lo = 0; lo < MAX_HZ; lo += BIN_HZ) {
      const hi = Math.min(MAX_HZ, lo + BIN_HZ);
      const b0 = Math.max(0, Math.floor(lo / binHz));
      const b1 = Math.min(specA.length - 1, Math.ceil(hi / binHz));
      let sumA = 0;
      let sumB = 0;
      for (let k = b0; k < b1; k++) {
        sumA += specA[k];
        sumB += specB[k];
      }
      out.push({ loHz: lo, hiHz: hi, diffDb: 10 * Math.log10((sumA + 1e-14) / (sumB + 1e-14)) });
    }
    return out;
  }, [available, props.a, props.b]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || size.width < 10 || bands.length === 0) return;
    const c = setupCanvas(canvas);
    if (!c) return;
    drawSpectrumDiff(c, bands, props.integrity.bandHz, props.integrity.flags.length > 0);
  };

  useEffect(() => {
    if (!inView || size.width < 10) return;
    if (prefersReducedMotion()) {
      draw();
      return;
    }
    // the strip is static; a short fade-in via framer wrapper handles motion
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, size.width, bands, props.sweepKey]);

  const lowLabel = `${props.integrity.bandHz[0]}–${props.integrity.bandHz[1]} Hz`;

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
          A−B speech spectrum difference — dips in the low band are the thinness signature
        </p>
        {props.integrity.flags.length > 0 && (
          <span className="rounded-full bg-red-tint px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-red-deep">
            ⚑ {props.integrity.flags.join(' · ').replace(/_/g, ' ')}
          </span>
        )}
      </div>
      {available ? (
        <div
          ref={setRefs}
          className="w-full overflow-hidden rounded-[10px] border border-hairline"
          style={{ height: STRIP_H }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
            role="img"
            aria-label={`A minus B speech spectrum difference in ${BIN_HZ} Hz bands from 0 to 4 kHz. Green where A has more energy, red where B has more. Low band ${lowLabel} underlined.`}
          />
        </div>
      ) : (
        <p className="rounded-[10px] border border-hairline bg-canvas-bg px-4 py-6 font-mono text-[12px] italic text-ink-faint">
          Difference strip unavailable — {props.integrity.detail}.
        </p>
      )}
      <p className="mt-3 border-t border-hairline pt-3 font-mono text-[12px] leading-relaxed text-ink-soft tabular">
        Mean power ratio per {BIN_HZ} Hz band on VAD-gated speech frames, 10·log10(A/B) in dB —
        green cells are bands where A carries more energy than B. The {lowLabel} low band
        {props.integrity.flags.length > 0
          ? ' is underlined in red: the spectral-integrity flag fired on B.'
          : ' is underlined in amber: the strict bass watch zone.'}
      </p>
    </motion.div>
  );
}
