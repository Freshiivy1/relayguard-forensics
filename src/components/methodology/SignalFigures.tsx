// Figure panels for the seven signal blocks. Canvas figures reuse the shared
// render primitives (setupCanvas, COLORS, MONO_FONT); diagram figures are
// inline SVG. No image assets are generated or fetched.
import { COLORS, MONO_FONT } from '@/lib/audio/render';
import type { CanvasCtx } from '@/lib/audio/render';
import FigureCanvas from './FigureCanvas';
import { cn } from '@/lib/utils';

// deterministic pseudo-random so figures are stable between renders
function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function framePlot(c: CanvasCtx, padL: number, padT: number, padR: number, padB: number) {
  const { ctx, width, height } = c;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.canvasBg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = COLORS.hairline;
  ctx.lineWidth = 1;
  ctx.strokeRect(padL + 0.5, padT + 0.5, width - padL - padR - 1, height - padT - padB - 1);
  return { plotW: width - padL - padR, plotH: height - padT - padB };
}

// ---------------------------------------------------------------- 1. voice --

function drawVoiceSpark(c: CanvasCtx) {
  const padL = 12;
  const padT = 14;
  const padR = 12;
  const padB = 34;
  const { ctx } = c;
  const { plotW, plotH } = framePlot(c, padL, padT, padR, padB);
  const rand = mulberry(7);
  const N = 160;

  const traj = (phase: number, wobble: number, r: () => number) => {
    const pts: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      pts.push(
        0.5 +
          0.26 * Math.sin(t * Math.PI * 4.2 + phase) +
          0.12 * Math.sin(t * Math.PI * 9.1 + phase * 2.3) +
          (r() - 0.5) * wobble,
      );
    }
    return pts;
  };
  const a = traj(0.4, 0.05, rand);
  const b = traj(0.55, 0.07, rand); // similar trajectory — same speaker

  const drawLine = (pts: number[], color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach((v, i) => {
      const x = padL + (i / (N - 1)) * plotW;
      const y = padT + (1 - v) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };
  drawLine(a, COLORS.green);
  drawLine(b, COLORS.red);

  // legend + readout
  ctx.font = MONO_FONT;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.green;
  ctx.fillText('A', padL + 2, padT + plotH + 22);
  ctx.fillStyle = COLORS.red;
  ctx.fillText('B', padL + 18, padT + plotH + 22);
  ctx.fillStyle = COLORS.inkFaint;
  ctx.fillText('MFCC TRAJECTORY · VAD-GATED SPEECH TURNS', padL + 40, padT + plotH + 22);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.inkSoft;
  ctx.fillText('COSINE SIMILARITY 0.83', padL + plotW, padT + plotH + 22);
}

export function VoiceSparkFigure() {
  return (
    <FigureCanvas
      draw={drawVoiceSpark}
      height={190}
      ariaLabel="Two overlapping MFCC trajectory sparklines, Audio A in green and Audio B in red, tracking each other closely. Cosine similarity readout: 0.83."
    />
  );
}

// ------------------------------------------------------------- 4. envelope --

function drawEnvelopes(c: CanvasCtx) {
  const padL = 12;
  const padT = 14;
  const padR = 12;
  const padB = 34;
  const { ctx } = c;
  const { plotW, plotH } = framePlot(c, padL, padT, padR, padB);
  const rand = mulberry(21);
  const N = 220;
  const DUR = 6;

  // shared burst pattern: A decays to near silence between bursts,
  // B's valleys are filled in by room reverb and noise
  const bursts = [0.4, 1.15, 1.7, 2.6, 3.35, 4.05, 4.9, 5.5];
  const envA: number[] = [];
  const envB: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * DUR;
    let s = 0;
    for (const b0 of bursts) {
      const d = (t - b0) / 0.16;
      s = Math.max(s, Math.exp(-d * d));
    }
    const a = Math.max(0.03, s * (0.75 + 0.25 * rand()));
    // relay: reverb tail + raised bed → shallower gaps, flatter duty cycle
    const tail = Math.min(1, s * 1.15 + 0.3);
    const b = Math.max(0.3, tail * (0.7 + 0.2 * rand()));
    envA.push(Math.min(1, a));
    envB.push(Math.min(1, b));
  }

  const fill = (pts: number[], color: string, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH);
    pts.forEach((v, i) => {
      ctx.lineTo(padL + (i / (N - 1)) * plotW, padT + (1 - v) * plotH);
    });
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  fill(envB, COLORS.red, 0.85);
  fill(envA, COLORS.green, 0.9);

  // time ticks
  ctx.font = MONO_FONT;
  ctx.fillStyle = COLORS.inkFaint;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.strokeStyle = COLORS.hairline;
  for (let t = 0; t <= DUR; t += 1) {
    const x = padL + (t / DUR) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, padT + plotH);
    ctx.lineTo(x, padT + plotH + 4);
    ctx.stroke();
    ctx.fillText(`${t}s`, x, padT + plotH + 7);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.green;
  ctx.fillText('A · DEEP VALLEYS', padL + 2, padT + plotH + 24);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.red;
  ctx.fillText('B · VALLEYS FILLED BY REVERB', padL + plotW, padT + plotH + 24);
}

export function EnvelopeFigure() {
  return (
    <FigureCanvas
      draw={drawEnvelopes}
      height={190}
      ariaLabel="Two amplitude envelope traces on a shared six-second axis. Audio A in green falls to near silence between bursts; Audio B in red stays raised, its valleys filled in by room reverb."
    />
  );
}

// -------------------------------------------------------- 5. spectral smear --

function drawSmear(c: CanvasCtx) {
  const padL = 34;
  const padT = 16;
  const padR = 12;
  const padB = 30;
  const { ctx } = c;
  const { plotW, plotH } = framePlot(c, padL, padT, padR, padB);
  const BINS = 40;
  const rand = mulberry(99);

  // crisp harmonic peaks for direct capture
  const peaks = [5, 9, 14, 19, 27];
  const a: number[] = [];
  for (let i = 0; i < BINS; i++) {
    let v = 0.04 + rand() * 0.02;
    for (const p of peaks) {
      const d = (i - p) / 0.9;
      v += Math.exp(-d * d) * (0.9 - 0.12 * peaks.indexOf(p));
    }
    a.push(Math.min(1, v));
  }
  // relay: peaks smeared by convolution with the room response, floor raised
  const b: number[] = a.map((_, i) => {
    let s = 0;
    let wsum = 0;
    for (let k = -4; k <= 4; k++) {
      const w = Math.exp(-(k * k) / 6);
      const j = Math.min(BINS - 1, Math.max(0, i + k));
      s += a[j] * w;
      wsum += w;
    }
    return Math.min(1, s / wsum + 0.1 + rand() * 0.03);
  });

  const rowH = plotH / 2;
  const barW = plotW / BINS;
  const drawRow = (vals: number[], y0: number, color: string, label: string) => {
    ctx.fillStyle = color;
    vals.forEach((v, i) => {
      const h = v * (rowH - 18);
      ctx.fillRect(padL + i * barW + 1, y0 + (rowH - 14) - h, Math.max(1, barW - 2), h);
    });
    ctx.font = MONO_FONT;
    ctx.fillStyle = COLORS.inkFaint;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, padL - 8, y0 + (rowH - 14) / 2);
  };
  drawRow(a, 0, COLORS.green, 'A');
  drawRow(b, rowH + 8, COLORS.red, 'B');

  // separator
  ctx.strokeStyle = COLORS.hairline;
  ctx.beginPath();
  ctx.moveTo(padL, rowH + 4.5);
  ctx.lineTo(padL + plotW, rowH + 4.5);
  ctx.stroke();

  // frequency axis 0–4 kHz
  ctx.fillStyle = COLORS.inkFaint;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let k = 0; k <= 4; k++) {
    const x = padL + (k / 4) * plotW;
    ctx.fillText(k === 0 ? '0' : `${k}k`, x, padT + plotH + 8);
  }
}

export function SmearFigure() {
  return (
    <FigureCanvas
      draw={drawSmear}
      height={210}
      ariaLabel="Two 40-bin spectra, 0 to 4 kHz. Audio A in green shows crisp harmonic peaks; Audio B in red shows the same peaks smeared and flattened by room reverberation."
    />
  );
}

// ------------------------------------------------------- 2. channel (band) --

/**
 * Inline replica of `method-diagram-band.svg`: 0–8 kHz axis, the 300–3400 Hz
 * telephone band shaded green-tint, dashed red edge lines at 300 / 3400 Hz.
 */
export function BandDiagramFigure() {
  const X0 = 70;
  const X1 = 1150;
  const Y = 300; // axis line
  const TOP = 92;
  const x = (hz: number) => X0 + (hz / 8000) * (X1 - X0);
  return (
    <svg
      viewBox="0 0 1200 400"
      className="h-auto w-full"
      role="img"
      aria-label="Frequency band diagram from 0 to 8 kHz. The telephone band from 300 to 3400 Hz is shaded; dashed red lines mark the band edges at 300 Hz and 3.4 kHz."
    >
      {/* telephone band shading */}
      <rect x={x(300)} y={TOP} width={x(3400) - x(300)} height={Y - TOP} fill="#DCE6DF" />
      {/* band edge dashed lines */}
      <line x1={x(300)} y1={TOP - 26} x2={x(300)} y2={Y} stroke="#A4453A" strokeWidth={1.5} strokeDasharray="6 5" />
      <line x1={x(3400)} y1={TOP - 26} x2={x(3400)} y2={Y} stroke="#A4453A" strokeWidth={1.5} strokeDasharray="6 5" />
      {/* axis */}
      <line x1={X0} y1={Y} x2={X1} y2={Y} stroke="#1C1B18" strokeWidth={1.5} />
      {Array.from({ length: 17 }, (_, i) => i * 500).map((hz) => (
        <g key={hz}>
          <line
            x1={x(hz)}
            y1={Y}
            x2={x(hz)}
            y2={Y + (hz % 1000 === 0 ? 10 : 5)}
            stroke="#8A867A"
            strokeWidth={1}
          />
          {hz % 1000 === 0 && (
            <text
              x={x(hz)}
              y={Y + 28}
              textAnchor="middle"
              className="fill-ink-faint"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize={13}
            >
              {hz === 0 ? '0' : `${hz / 1000}k`}
            </text>
          )}
        </g>
      ))}
      <text x={X1} y={Y + 52} textAnchor="end" className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={12} letterSpacing={2}>
        FREQUENCY · HZ
      </text>
      {/* edge labels */}
      <text x={x(300)} y={TOP - 38} textAnchor="middle" fill="#8A372D" fontFamily="'IBM Plex Mono', monospace" fontSize={13}>
        300 Hz
      </text>
      <text x={x(3400)} y={TOP - 38} textAnchor="middle" fill="#8A372D" fontFamily="'IBM Plex Mono', monospace" fontSize={13}>
        3.4 kHz
      </text>
      {/* region labels */}
      <text x={(X0 + x(300)) / 2} y={TOP + 44} textAnchor="middle" className="fill-ink-soft" fontFamily="'IBM Plex Mono', monospace" fontSize={12} letterSpacing={2}>
        SUB-BAND
      </text>
      <text x={(X0 + x(300)) / 2} y={TOP + 64} textAnchor="middle" className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={11}>
        &lt; 300 Hz
      </text>
      <text x={(x(300) + x(3400)) / 2} y={TOP + 44} textAnchor="middle" fill="#244A3D" fontFamily="'IBM Plex Mono', monospace" fontSize={12} letterSpacing={2}>
        TELEPHONE BAND
      </text>
      <text x={(x(300) + x(3400)) / 2} y={TOP + 64} textAnchor="middle" fill="#244A3D" fontFamily="'IBM Plex Mono', monospace" fontSize={11}>
        300–3400 Hz
      </text>
      <text x={(x(3400) + X1) / 2} y={TOP + 44} textAnchor="middle" className="fill-ink-soft" fontFamily="'IBM Plex Mono', monospace" fontSize={12} letterSpacing={2}>
        ABOVE-BAND
      </text>
      <text x={(x(3400) + X1) / 2} y={TOP + 64} textAnchor="middle" className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={11}>
        &gt; 3.4 kHz
      </text>
      {/* demo annotations: where the two demo clips put their energy */}
      <circle cx={x(717)} cy={Y - 26} r={4} fill="#2F5B4C" />
      <text x={x(717)} y={Y - 40} textAnchor="middle" fill="#244A3D" fontFamily="'IBM Plex Mono', monospace" fontSize={11}>
        A · CENTROID 717 Hz
      </text>
      <circle cx={x(2055)} cy={Y - 66} r={4} fill="#A4453A" />
      <text x={x(2055)} y={Y - 80} textAnchor="middle" fill="#8A372D" fontFamily="'IBM Plex Mono', monospace" fontSize={11}>
        B · CENTROID 2055 Hz
      </text>
    </svg>
  );
}

// ------------------------------------------------- 3. relay fingerprint CNN --

const RELAY_STATES = [
  { score: '0.18', state: 'GREEN', chip: 'bg-green-tint text-green-deep', note: 'direct capture' },
  { score: '0.52', state: 'AMBER', chip: 'bg-amber-tint text-amber-deep', note: 'inconclusive' },
  { score: '0.71', state: 'RED', chip: 'bg-red-tint text-red-deep', note: 'relayed — demo clip B' },
];

export function RelayStateFigure() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {RELAY_STATES.map((s) => (
          <div key={s.state} className={cn('rounded-xl px-3 py-5 text-center', s.chip)}>
            <div className="font-mono text-[24px] font-medium tabular md:text-[30px]">
              {s.score}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
              {s.state}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1">
        {RELAY_STATES.map((s) => (
          <div key={s.state} className="flex items-baseline gap-2 font-mono text-[11px] text-ink-faint">
            <span className="tabular">{s.score}</span>
            <span aria-hidden="true">·</span>
            <span>{s.note}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        Bundled CNN · per-clip relay score 0–1
      </p>
    </div>
  );
}

// ------------------------------------------------------------- 6. noise bed --

/** Vertical dB ruler −90…0 dB with the two measured demo markers. */
export function NoiseRulerFigure() {
  const X = 96;
  const TOP = 24;
  const BOT = 292;
  const y = (db: number) => TOP + ((-db / 90) * (BOT - TOP));
  return (
    <svg
      viewBox="0 0 340 320"
      className="mx-auto h-auto w-full max-w-[340px]"
      role="img"
      aria-label="Noise-bed ruler from minus 90 to 0 dB. Marker A sits at minus 88.5 dB, labelled quiet. Marker B sits at minus 31.5 dB, labelled very noisy."
    >
      <line x1={X} y1={TOP} x2={X} y2={BOT} stroke="#1C1B18" strokeWidth={1.5} />
      {Array.from({ length: 10 }, (_, i) => -i * 10).map((db) => (
        <g key={db}>
          <line x1={X - 6} y1={y(db)} x2={X} y2={y(db)} stroke="#8A867A" strokeWidth={1} />
          <text
            x={X - 12}
            y={y(db) + 4}
            textAnchor="end"
            className="fill-ink-faint"
            fontFamily="'IBM Plex Mono', monospace"
            fontSize={11}
          >
            {db === 0 ? '0' : `−${-db}`}
          </text>
        </g>
      ))}
      <text x={X - 44} y={TOP - 8} textAnchor="end" className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={10} letterSpacing={2}>
        dB
      </text>
      {/* marker B */}
      <line x1={X} y1={y(-31.5)} x2={X + 26} y2={y(-31.5)} stroke="#A4453A" strokeWidth={1.5} />
      <circle cx={X} cy={y(-31.5)} r={5} fill="#A4453A" />
      <text x={X + 34} y={y(-31.5) - 2} fill="#8A372D" fontFamily="'IBM Plex Mono', monospace" fontSize={12}>
        B · −31.5 dB
      </text>
      <text x={X + 34} y={y(-31.5) + 14} className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={10} letterSpacing={1.5}>
        VERY_NOISY · SNR 11.9 dB
      </text>
      {/* marker A */}
      <line x1={X} y1={y(-88.5)} x2={X + 26} y2={y(-88.5)} stroke="#2F5B4C" strokeWidth={1.5} />
      <circle cx={X} cy={y(-88.5)} r={5} fill="#2F5B4C" />
      <text x={X + 34} y={y(-88.5) - 2} fill="#244A3D" fontFamily="'IBM Plex Mono', monospace" fontSize={12}>
        A · −88.5 dB
      </text>
      <text x={X + 34} y={y(-88.5) + 14} className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={10} letterSpacing={1.5}>
        QUIET · SNR 67.8 dB
      </text>
    </svg>
  );
}

// ------------------------------------------------------ 8. active probe --

/**
 * Probe band diagram: 0–8 kHz axis with the shaped probe band (500 Hz–6 kHz)
 * shaded amber, the stripped sub-300 Hz region hatched, and the field anchors
 * (8.5 dB speech-to-bed margin, 43× smear separation) annotated.
 */
export function ProbeBandFigure() {
  const X0 = 30;
  const X1 = 310;
  const TOP = 40;
  const BOT = 150;
  const x = (hz: number) => X0 + (hz / 8000) * (X1 - X0);
  // schematic probe magnitude shape: HP ramp to 500, presence lift 1–4k, LP from 6k
  const mag = (hz: number) => {
    const hp = 1 / (1 + Math.pow(500 / Math.max(hz, 1), 4));
    const lp = 1 / (1 + Math.pow(hz / 6000, 4));
    const lift = 1 + 0.5 * Math.exp(-Math.pow((hz - 2000) / 1100, 2));
    return hp * lp * lift;
  };
  const N = 90;
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const hz = (i / (N - 1)) * 8000;
    const y = BOT - mag(hz) * (BOT - TOP - 14);
    pts.push(`${i === 0 ? 'M' : 'L'} ${x(hz).toFixed(1)} ${y.toFixed(1)}`);
  }
  return (
    <svg
      viewBox="0 0 340 210"
      className="mx-auto h-auto w-full max-w-[380px]"
      role="img"
      aria-label="Probe band diagram from 0 to 8 kHz. The shaped probe noise occupies 500 Hz to 6 kHz with a gentle 1 to 4 kHz presence lift; everything below 300 Hz is empty because the telephone channel strips it. Anchors annotated: 8.5 dB speech-to-bed margin equals speakerphone drowning, and the probe-band smear separates speakerphone from direct 43 to 1."
    >
      {/* probe band shading */}
      <rect x={x(500)} y={TOP} width={x(6000) - x(500)} height={BOT - TOP} fill="#F0E4CC" />
      {/* stripped sub-300 region (hatched) */}
      <rect x={X0} y={TOP} width={x(300) - X0} height={BOT - TOP} fill="#EDE9E0" />
      {Array.from({ length: 5 }, (_, i) => (
        <line
          key={i}
          x1={X0 + i * 4}
          y1={BOT}
          x2={X0 + i * 4 + 10}
          y2={TOP}
          stroke="#D8D2C4"
          strokeWidth={0.75}
        />
      ))}
      {/* band edges */}
      <line x1={x(500)} y1={TOP - 12} x2={x(500)} y2={BOT} stroke="#B07E2B" strokeWidth={1.5} strokeDasharray="6 5" />
      <line x1={x(6000)} y1={TOP - 12} x2={x(6000)} y2={BOT} stroke="#B07E2B" strokeWidth={1.5} strokeDasharray="6 5" />
      {/* probe shape */}
      <path d={pts.join(' ')} fill="none" stroke="#B07E2B" strokeWidth={2} />
      {/* axis */}
      <line x1={X0} y1={BOT} x2={X1} y2={BOT} stroke="#1C1B18" strokeWidth={1.5} />
      {[0, 2000, 4000, 6000, 8000].map((hz) => (
        <g key={hz}>
          <line x1={x(hz)} y1={BOT} x2={x(hz)} y2={BOT + 7} stroke="#8A867A" strokeWidth={1} />
          <text
            x={x(hz)}
            y={BOT + 22}
            textAnchor="middle"
            className="fill-ink-faint"
            fontFamily="'IBM Plex Mono', monospace"
            fontSize={11}
          >
            {hz === 0 ? '0' : `${hz / 1000}k`}
          </text>
        </g>
      ))}
      {/* labels */}
      <text x={(X0 + x(300)) / 2 + 6} y={TOP + 14} textAnchor="middle" className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={9} letterSpacing={1}>
        STRIPPED
      </text>
      <text x={x(500)} y={TOP - 18} textAnchor="middle" fill="#8A6420" fontFamily="'IBM Plex Mono', monospace" fontSize={11}>
        500 Hz
      </text>
      <text x={x(6000)} y={TOP - 18} textAnchor="middle" fill="#8A6420" fontFamily="'IBM Plex Mono', monospace" fontSize={11}>
        6 kHz
      </text>
      <text x={x(2000)} y={TOP + 26} textAnchor="middle" fill="#8A6420" fontFamily="'IBM Plex Mono', monospace" fontSize={10} letterSpacing={1.5}>
        PRESENCE LIFT
      </text>
      <text x={x(2000)} y={TOP + 40} textAnchor="middle" className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={9}>
        1–4 kHz
      </text>
      {/* anchors */}
      <text x={X0} y={BOT + 44} className="fill-ink-soft" fontFamily="'IBM Plex Mono', monospace" fontSize={10} letterSpacing={1}>
        MARGIN 8.5 dB = SPEAKERPHONE DROWNING
      </text>
      <text x={X0} y={BOT + 60} className="fill-ink-soft" fontFamily="'IBM Plex Mono', monospace" fontSize={10} letterSpacing={1}>
        SMEAR 0.1469 vs 0.0034 = 43× SEPARATION
      </text>
    </svg>
  );
}

// ------------------------------------------------------- 7. conversation --

/** Correlation gauge: arc 0–1, needle at 0.78, threshold tick at ≥ 0.72. */
export function CorrelationGaugeFigure() {
  const CX = 170;
  const CY = 172;
  const R = 118;
  const pt = (v: number, r = R) => {
    const th = Math.PI * (1 - v);
    return [CX + r * Math.cos(th), CY - r * Math.sin(th)] as const;
  };
  const arc = (v0: number, v1: number, r = R) => {
    const [x0, y0] = pt(v0, r);
    const [x1, y1] = pt(v1, r);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const [nx, ny] = pt(0.78, R - 26);
  const [t0x, t0y] = pt(0.72, R - 12);
  const [t1x, t1y] = pt(0.72, R + 12);
  return (
    <svg
      viewBox="0 0 340 210"
      className="mx-auto h-auto w-full max-w-[380px]"
      role="img"
      aria-label="Correlation gauge from 0 to 1. The needle rests at 0.78, above the shared-content threshold of 0.72."
    >
      <path d={arc(0, 1)} fill="none" stroke="#D8D2C4" strokeWidth={10} strokeLinecap="round" />
      <path d={arc(0, 0.78)} fill="none" stroke="#2F5B4C" strokeWidth={10} strokeLinecap="round" />
      {/* threshold tick */}
      <line x1={t0x} y1={t0y} x2={t1x} y2={t1y} stroke="#A4453A" strokeWidth={2} strokeDasharray="3 3" />
      <text x={t1x + 4} y={t1y - 2} fill="#8A372D" fontFamily="'IBM Plex Mono', monospace" fontSize={11}>
        ≥ 0.72
      </text>
      {/* needle */}
      <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="#1C1B18" strokeWidth={2} />
      <circle cx={CX} cy={CY} r={5} fill="#1C1B18" />
      {/* scale labels */}
      <text x={pt(0)[0] - 6} y={CY + 22} textAnchor="middle" className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={11}>
        0
      </text>
      <text x={pt(1)[0] + 6} y={CY + 22} textAnchor="middle" className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={11}>
        1
      </text>
      <text x={CX} y={CY - 44} textAnchor="middle" className="fill-ink" fontFamily="'IBM Plex Mono', monospace" fontSize={26}>
        0.78
      </text>
      <text x={CX} y={CY + 26} textAnchor="middle" className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={10} letterSpacing={2}>
        LONG-TERM SPECTRUM CORRELATION
      </text>
    </svg>
  );
}
