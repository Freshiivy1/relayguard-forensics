// render.ts — Canvas 2D renderers for RelayGuard visualizers.
// All renderers handle devicePixelRatio scaling via setupCanvas.
import type { Spectrogram } from './stft';
import type { SpeechTurn } from './vad';
import type { BandEnergies } from './features';

export const COLORS = {
  paper: '#F5F2EC',
  paperDeep: '#EDE9E0',
  paperEdge: '#E3DED3',
  ink: '#1C1B18',
  inkSoft: '#57544B',
  inkFaint: '#8A867A',
  hairline: '#D8D2C4',
  green: '#2F5B4C',
  greenDeep: '#244A3D',
  greenTint: '#DCE6DF',
  red: '#A4453A',
  redDeep: '#8A372D',
  redTint: '#F0DDD8',
  amber: '#B07E2B',
  amberTint: '#F0E4CC',
  canvasBg: '#FBF9F4',
} as const;

export const MONO_FONT = '10px "IBM Plex Mono", monospace';

export interface CanvasCtx {
  ctx: CanvasRenderingContext2D;
  width: number; // css px
  height: number;
  dpr: number;
}

/** Size a canvas for its CSS box and return a DPR-scaled context. */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasCtx | null {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height, dpr };
}

function niceTimeStep(duration: number): number {
  const steps = [0.5, 1, 2, 5, 10, 20, 30, 60];
  for (const s of steps) if (duration / s <= 8) return s;
  return 120;
}

function fmtTick(t: number): string {
  return `${Number.isInteger(t) ? t : t.toFixed(1)}s`;
}

// ---------------------------------------------------------------- waveform --

export interface WaveformOpts {
  color: string;
  turns?: SpeechTurn[];
  turnTint?: string;
  duration: number;
  bare?: boolean; // mini thumbnail: no axes/ticks
  reveal?: number; // 0..1 left→right clip reveal
}

export function drawWaveform(c: CanvasCtx, samples: Float32Array, _sr: number, opts: WaveformOpts): void {
  void _sr;
  const { ctx, width, height } = c;
  const padL = opts.bare ? 2 : 34;
  const padR = opts.bare ? 2 : 10;
  const padT = 8;
  const padB = opts.bare ? 8 : 24;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const midY = padT + plotH / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.canvasBg;
  ctx.fillRect(0, 0, width, height);

  const dur = Math.max(opts.duration, 1e-6);

  // speech-turn tint bands
  if (opts.turns && opts.turnTint && !opts.bare) {
    ctx.fillStyle = opts.turnTint;
    for (const t of opts.turns) {
      const x0 = padL + (t.start_s / dur) * plotW;
      const x1 = padL + (t.end_s / dur) * plotW;
      ctx.fillRect(x0, padT, Math.max(1, x1 - x0), plotH);
    }
  }

  // waveform, min/max buckets per pixel column
  const cols = Math.max(1, Math.floor(plotW));
  const total = samples.length;
  ctx.fillStyle = opts.color;
  for (let x = 0; x < cols; x++) {
    const i0 = Math.floor((x / cols) * total);
    const i1 = Math.max(i0 + 1, Math.floor(((x + 1) / cols) * total));
    let mn = 0;
    let mx = 0;
    for (let i = i0; i < i1 && i < total; i++) {
      const v = samples[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    const y0 = midY - mx * (plotH / 2) * 0.94;
    const y1 = midY - mn * (plotH / 2) * 0.94;
    ctx.fillRect(padL + x, y0, 1, Math.max(1, y1 - y0));
  }

  // zero line
  ctx.strokeStyle = COLORS.hairline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, midY + 0.5);
  ctx.lineTo(padL + plotW, midY + 0.5);
  ctx.stroke();

  if (!opts.bare) {
    // time ticks
    ctx.fillStyle = COLORS.inkFaint;
    ctx.font = MONO_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const step = niceTimeStep(dur);
    ctx.strokeStyle = COLORS.hairline;
    for (let t = 0; t <= dur + 1e-6; t += step) {
      const x = padL + (t / dur) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padT + plotH);
      ctx.lineTo(x, padT + plotH + 4);
      ctx.stroke();
      ctx.fillText(fmtTick(t), x, padT + plotH + 7);
    }
    // frame
    ctx.strokeStyle = COLORS.hairline;
    ctx.strokeRect(padL + 0.5, padT + 0.5, plotW - 1, plotH - 1);
  }

  // clip reveal (scanline wipe)
  if (opts.reveal !== undefined && opts.reveal < 1) {
    ctx.fillStyle = COLORS.canvasBg;
    const rx = padL + plotW * opts.reveal;
    ctx.fillRect(rx, padT, padL + plotW - rx, plotH);
  }
}

// ------------------------------------------------------------- spectrogram --

export interface SpectrogramGeometry {
  padL: number;
  padR: number;
  padT: number;
  padB: number;
  plotW: number;
  plotH: number;
  width: number;
  height: number;
  duration: number;
  maxHz: number;
}

export function spectrogramGeometry(width: number, height: number, duration: number, maxHz = 4000): SpectrogramGeometry {
  const padL = 44;
  const padR = 66;
  const padT = 12;
  const padB = 28;
  return {
    padL,
    padR,
    padT,
    padB,
    plotW: Math.max(10, width - padL - padR),
    plotH: Math.max(10, height - padT - padB),
    width,
    height,
    duration,
    maxHz,
  };
}

// ink-density colormap: paper-deep → green → ink
function colormap(t: number): [number, number, number] {
  const lo: [number, number, number] = [237, 233, 224];
  const mid: [number, number, number] = [47, 91, 76];
  const hi: [number, number, number] = [28, 27, 24];
  if (t < 0.5) {
    const u = t / 0.5;
    return [
      lo[0] + (mid[0] - lo[0]) * u,
      lo[1] + (mid[1] - lo[1]) * u,
      lo[2] + (mid[2] - lo[2]) * u,
    ];
  }
  const u = (t - 0.5) / 0.5;
  return [
    mid[0] + (hi[0] - mid[0]) * u,
    mid[1] + (hi[1] - mid[1]) * u,
    mid[2] + (hi[2] - mid[2]) * u,
  ];
}

/**
 * Render the spectrogram plot area into an offscreen canvas (cached; reused
 * for scanline reveals and hover redraws).
 */
export function renderSpectrogramImage(spec: Spectrogram, plotW: number, plotH: number, maxHz = 4000): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(plotW));
  off.height = Math.max(1, Math.round(plotH));
  const ctx = off.getContext('2d');
  if (!ctx) return off;
  const w = off.width;
  const h = off.height;
  const img = ctx.createImageData(w, h);
  const data = img.data;

  const binHz = spec.sampleRate / 2 / (spec.bins - 1);
  const maxBin = Math.min(spec.bins - 1, Math.floor(maxHz / binHz));

  // global dB normalization
  let maxP = 0;
  for (let f = 0; f < spec.frames; f++) {
    const row = spec.power[f];
    for (let b = 0; b <= maxBin; b++) if (row[b] > maxP) maxP = row[b];
  }
  const maxDb = 10 * Math.log10(maxP + 1e-14);
  const floorDb = maxDb - 62;

  for (let x = 0; x < w; x++) {
    const f = Math.min(spec.frames - 1, Math.floor((x / w) * spec.frames));
    const row = f >= 0 ? spec.power[f] : null;
    for (let y = 0; y < h; y++) {
      // y=0 top = maxHz
      const hz = ((h - 1 - y) / (h - 1)) * maxHz;
      const b = Math.min(maxBin, Math.max(0, Math.round(hz / binHz)));
      let t = 0;
      if (row) {
        const db = 10 * Math.log10(row[b] + 1e-14);
        t = Math.max(0, Math.min(1, (db - floorDb) / (maxDb - floorDb)));
      }
      const [r, g, bl] = colormap(t);
      const o = (y * w + x) * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = bl;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return off;
}

export interface SpectrogramDrawOpts {
  reveal?: number; // 0..1 scanline wipe
  scanline?: boolean; // draw red 2px line at reveal edge
  drawEdges?: boolean; // dashed 300/3400 Hz lines + labels
  edgeProgress?: number; // 0..1 draw-in progress for dashed lines
  crosshair?: { t: number; f: number } | null;
  /** translucent low-band zone marking the strict bass/thinness watch region */
  lowBand?: { loHz: number; hiHz: number; flagged: boolean };
}

export function drawSpectrogram(
  c: CanvasCtx,
  img: HTMLCanvasElement,
  geom: SpectrogramGeometry,
  opts: SpectrogramDrawOpts = {},
): void {
  const { ctx, width, height } = c;
  const { padL, padT, plotW, plotH, duration, maxHz } = geom;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.canvasBg;
  ctx.fillRect(0, 0, width, height);

  // plot (with optional reveal wipe)
  const reveal = opts.reveal ?? 1;
  const revealW = Math.floor(plotW * reveal);
  if (revealW > 0) {
    const srcW = (revealW / plotW) * img.width;
    ctx.drawImage(img, 0, 0, srcW, img.height, padL, padT, revealW, plotH);
  }
  if (reveal < 1) {
    ctx.fillStyle = COLORS.paperDeep;
    ctx.fillRect(padL + revealW, padT, plotW - revealW, plotH);
  }
  if (opts.scanline && reveal < 1 && reveal > 0) {
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(padL + revealW - 1, padT, 2, plotH);
  }

  // low-band watch zone (0–300 Hz, or 300–500 Hz on the poor baseline):
  // translucent amber shading over the revealed plot; red dashed borders when
  // the clip's spectral-integrity flag fired.
  if (opts.lowBand && revealW > 0) {
    const { loHz, hiHz, flagged } = opts.lowBand;
    const yLo = padT + plotH - (Math.min(loHz, maxHz) / maxHz) * plotH;
    const yHi = padT + plotH - (Math.min(hiHz, maxHz) / maxHz) * plotH;
    ctx.save();
    ctx.fillStyle = 'rgba(176, 126, 43, 0.14)'; // amber tint over the plot
    ctx.fillRect(padL, yHi, revealW, yLo - yHi);
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = flagged ? COLORS.red : COLORS.amber;
    ctx.lineWidth = flagged ? 1.5 : 1;
    for (const y of [yHi, yLo]) {
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + revealW, y);
      ctx.stroke();
    }
    // zone tag, top-right of the band
    ctx.setLineDash([]);
    const tag = `${loHz}–${hiHz} Hz low band`;
    ctx.font = MONO_FONT;
    const tw = ctx.measureText(tag).width;
    ctx.fillStyle = flagged ? COLORS.redTint : COLORS.amberTint;
    ctx.fillRect(padL + revealW - tw - 14, yHi - 17, tw + 10, 14);
    ctx.fillStyle = flagged ? COLORS.redDeep : COLORS.amber;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, padL + revealW - tw - 9, yHi - 10);
    ctx.restore();
  }

  // y-axis ticks (every 500 Hz)
  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = MONO_FONT;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = COLORS.hairline;
  for (let hz = 0; hz <= maxHz; hz += 500) {
    const y = padT + plotH - (hz / maxHz) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL - 4, y);
    ctx.lineTo(padL, y);
    ctx.stroke();
    ctx.fillText(hz === 0 ? '0' : hz >= 1000 ? `${(hz / 1000).toFixed(hz % 1000 ? 1 : 0)}k` : `${hz}`, padL - 7, y);
  }
  // x-axis time ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = niceTimeStep(duration);
  for (let t = 0; t <= duration + 1e-6; t += step) {
    const x = padL + (t / duration) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, padT + plotH);
    ctx.lineTo(x, padT + plotH + 4);
    ctx.stroke();
    ctx.fillText(fmtTick(t), x, padT + plotH + 7);
  }
  // frame
  ctx.strokeRect(padL + 0.5, padT + 0.5, plotW - 1, plotH - 1);

  // telephone-band edge lines
  if (opts.drawEdges) {
    const prog = opts.edgeProgress ?? 1;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 1.25;
    for (const hz of [300, 3400]) {
      if (hz > maxHz) continue;
      const y = padT + plotH - (hz / maxHz) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW * prog, y);
      ctx.stroke();
      if (prog >= 1) {
        const label = hz === 300 ? '300 Hz' : '3.4 kHz';
        ctx.setLineDash([]);
        ctx.font = MONO_FONT;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = COLORS.redTint;
        ctx.fillRect(padL + plotW + 6, y - 8, tw + 10, 16);
        ctx.strokeStyle = COLORS.red;
        ctx.lineWidth = 1;
        ctx.strokeRect(padL + plotW + 6.5, y - 7.5, tw + 9, 15);
        ctx.fillStyle = COLORS.redDeep;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, padL + plotW + 11, y + 0.5);
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = COLORS.red;
        ctx.lineWidth = 1.25;
      }
    }
    ctx.restore();
  }

  // crosshair + tooltip
  if (opts.crosshair) {
    const { t, f } = opts.crosshair;
    const x = padL + (t / duration) * plotW;
    const y = padT + plotH - (f / maxHz) * plotH;
    ctx.save();
    ctx.strokeStyle = COLORS.inkSoft;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    const label = `t = ${t.toFixed(2)} s · f = ${Math.round(f).toLocaleString('en-US').replace(/,/g, ' ')} Hz`;
    ctx.font = '11px "IBM Plex Mono", monospace';
    const tw = ctx.measureText(label).width;
    let bx = x + 10;
    let by = y - 30;
    if (bx + tw + 16 > padL + plotW) bx = x - tw - 26;
    if (by < padT) by = y + 12;
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.roundRect(bx, by, tw + 16, 22, 6);
    ctx.fill();
    ctx.fillStyle = COLORS.paper;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + 8, by + 11);
    ctx.restore();
  }
}

// ------------------------------------------------------------- band chart --

export interface BandChartData {
  a: BandEnergies;
  b: BandEnergies;
  reveal?: number; // 0..1 bar growth
}

export function drawBandChart(c: CanvasCtx, data: BandChartData): void {
  const { ctx, width, height } = c;
  const padL = 46;
  const padR = 14;
  const padT = 18;
  const padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const reveal = data.reveal ?? 1;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.canvasBg;
  ctx.fillRect(0, 0, width, height);

  // gridlines every 20%
  ctx.font = MONO_FONT;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let p = 0; p <= 100; p += 20) {
    const y = padT + plotH - (p / 100) * plotH;
    ctx.strokeStyle = COLORS.hairline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y + 0.5);
    ctx.lineTo(padL + plotW, y + 0.5);
    ctx.stroke();
    ctx.fillStyle = COLORS.inkFaint;
    ctx.fillText(`${p}%`, padL - 7, y);
  }

  const groups: [string, number, number][] = [
    ['SUB-300 HZ', data.a.sub300 * 100, data.b.sub300 * 100],
    ['IN-BAND 300–3400 HZ', data.a.inband * 100, data.b.inband * 100],
    ['ABOVE 3.4 KHZ', data.a.above3400 * 100, data.b.above3400 * 100],
  ];
  const groupW = plotW / 3;
  const barW = Math.min(56, groupW * 0.22);
  const gap = 10;

  ctx.textAlign = 'center';
  groups.forEach(([label, va, vb], gi) => {
    const cx = padL + groupW * gi + groupW / 2;
    const bars: [number, string][] = [
      [va, COLORS.green],
      [vb, COLORS.red],
    ];
    bars.forEach(([v, color], bi) => {
      const x = cx + (bi === 0 ? -barW - gap / 2 : gap / 2);
      const h = Math.max(1, (v / 100) * plotH * reveal);
      const y = padT + plotH - h;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, h, [4, 4, 0, 0]);
      ctx.fill();
      if (reveal >= 1) {
        ctx.fillStyle = COLORS.inkSoft;
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${v.toFixed(1)}%`, x + barW / 2, y - 4);
      }
    });
    ctx.fillStyle = COLORS.inkFaint;
    ctx.textBaseline = 'top';
    ctx.fillText(label, cx, padT + plotH + 10);
  });
}

// ---------------------------------------------------- spectrum diff strip --

export interface SpectrumDiffBand {
  loHz: number;
  hiHz: number;
  /** 10·log10(A/B) power ratio in the band: positive = A has more energy */
  diffDb: number;
}

/**
 * Single-row heat strip of mean speech spectrum A − B per band: green where A
 * carries more energy, red where B does. The low band is underlined in amber
 * (red when flagged) — dips there are the thinness signature.
 */
export function drawSpectrumDiff(
  c: CanvasCtx,
  bands: SpectrumDiffBand[],
  lowBandHz: [number, number],
  flagged: boolean,
): void {
  const { ctx, width, height } = c;
  const padL = 44;
  const padR = 14;
  const padT = 14;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.canvasBg;
  ctx.fillRect(0, 0, width, height);

  let maxAbs = 0;
  for (const b of bands) maxAbs = Math.max(maxAbs, Math.abs(b.diffDb));
  if (maxAbs < 1e-6) maxAbs = 1;

  const n = bands.length;
  const cw = plotW / n;
  for (let i = 0; i < n; i++) {
    const b = bands[i];
    const t = Math.max(-1, Math.min(1, b.diffDb / maxAbs));
    const x = padL + i * cw;
    ctx.fillStyle =
      t >= 0 ? mixHex(COLORS.paperEdge, COLORS.green, Math.abs(t)) : mixHex(COLORS.paperEdge, COLORS.red, Math.abs(t));
    ctx.beginPath();
    ctx.roundRect(x + 1.5, padT, Math.max(1, cw - 3), plotH, 3);
    ctx.fill();
    // amber underline where the band overlaps the low-band watch zone
    if (b.loHz < lowBandHz[1] && b.hiHz > lowBandHz[0]) {
      ctx.fillStyle = flagged ? COLORS.red : COLORS.amber;
      ctx.fillRect(x + 1.5, padT + plotH - 3, Math.max(1, cw - 3), 3);
    }
  }

  // zero annotation + legend
  ctx.font = MONO_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.greenDeep;
  ctx.fillText('green = A stronger', padL, padT - 7 > 6 ? padT - 7 : 7);
  ctx.fillStyle = COLORS.redDeep;
  ctx.textAlign = 'right';
  ctx.fillText('red = B stronger', padL + plotW, padT - 7 > 6 ? padT - 7 : 7);

  // frequency axis (every 500 Hz) + low-band tag
  ctx.fillStyle = COLORS.inkFaint;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const maxHz = bands.length > 0 ? bands[bands.length - 1].hiHz : 4000;
  ctx.strokeStyle = COLORS.hairline;
  for (let hz = 0; hz <= maxHz; hz += 500) {
    const x = padL + (hz / maxHz) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, padT + plotH);
    ctx.lineTo(x, padT + plotH + 4);
    ctx.stroke();
    ctx.fillText(hz === 0 ? '0' : hz >= 1000 ? `${(hz / 1000).toFixed(hz % 1000 ? 1 : 0)}k` : `${hz}`, x, padT + plotH + 7);
  }
  // low-band tag under the axis region
  const lbX = padL + (((lowBandHz[0] + lowBandHz[1]) / 2) / maxHz) * plotW;
  ctx.fillStyle = flagged ? COLORS.redDeep : COLORS.amber;
  ctx.textAlign = 'center';
  ctx.fillText(
    `low band ${lowBandHz[0]}–${lowBandHz[1]} Hz${flagged ? ' ⚑' : ''}`,
    Math.max(padL + 30, lbX),
    padT + plotH + 7,
  );
}

// --------------------------------------------------------- interval strip --

export interface ScanCell {
  start_s: number;
  end_s: number;
  score: number;
  state: 'GREEN' | 'AMBER' | 'RED';
}

function mixHex(c1: string, c2: string, t: number): string {
  const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const a = p(c1);
  const b = p(c2);
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

export function drawScanStrip(c: CanvasCtx, cells: ScanCell[], duration: number, hoverIdx: number | null): void {
  const { ctx, width, height } = c;
  const padL = 8;
  const padR = 8;
  const padT = 10;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.canvasBg;
  ctx.fillRect(0, 0, width, height);

  const dur = Math.max(duration, 1e-6);
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const x0 = padL + (cell.start_s / dur) * plotW;
    const x1 = padL + (cell.end_s / dur) * plotW;
    const w = Math.max(2, x1 - x0 - 2);
    ctx.fillStyle = mixHex(COLORS.greenTint, COLORS.redTint, cell.score);
    ctx.beginPath();
    ctx.roundRect(x0, padT, w, plotH, 4);
    ctx.fill();
    ctx.strokeStyle = COLORS.hairline;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (hoverIdx === i) {
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (w >= 40) {
      ctx.fillStyle = COLORS.inkSoft;
      ctx.font = MONO_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.score.toFixed(2), x0 + w / 2, padT + plotH / 2);
    }
  }

  // time axis
  ctx.fillStyle = COLORS.inkFaint;
  ctx.font = MONO_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = niceTimeStep(dur);
  ctx.strokeStyle = COLORS.hairline;
  for (let t = 0; t <= dur + 1e-6; t += step) {
    const x = padL + (t / dur) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, padT + plotH);
    ctx.lineTo(x, padT + plotH + 4);
    ctx.stroke();
    ctx.fillText(fmtTick(t), x, padT + plotH + 7);
  }
}
