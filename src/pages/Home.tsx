import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import DropzoneCard, { type ClipMeta } from '@/components/home/DropzoneCard';
import Results, { type AnalysisBundle } from '@/components/home/Results';
import { CheckIcon } from '@/components/icons';
import { decodeAudio } from '@/lib/audio/decode';
import { applyBaseline, BASELINES, type BaselineMode } from '@/lib/audio/channel';
import { analyzeClip } from '@/lib/audio/features';
import { compareClips, relayFingerprint } from '@/lib/audio/compare';
import type { ScanCell } from '@/lib/audio/render';
import type { GroundTruth } from '@/lib/audio/export';
import type { ProbeMeta } from '@/lib/audio/probe';
import { stopAll } from '@/lib/audio/player';

const SR = 16000;

interface LoadedClip extends ClipMeta {
  raw: Float32Array;
}

const DEMO_A = [
  { label: 'Normal · direct (quiet room)', url: '/demo/normal-direct.m4a' },
  { label: 'Noisy · direct', url: '/demo/noisy-direct.m4a' },
];
const DEMO_B = [
  { label: 'Normal · speakerphone', url: '/demo/normal-speakerphone.m4a' },
  { label: 'Noisy · speakerphone', url: '/demo/noisy-speakerphone.m4a' },
];

const STAGES = [
  'decoding',
  'resampling',
  'VAD gating',
  'spectral statistics',
  'relay model',
  'voting',
];

const CHECKLIST = [
  { label: 'Voice match model (MFCC + VAD gate)', status: 'READY' },
  { label: 'Relay detector (fused heuristic, bundled)', status: 'READY' },
  { label: 'DSP core (16 kHz mono resampler)', status: 'READY' },
  { label: 'Demo clips ×4', status: 'HTTP 200' },
  { label: 'Analysis sandbox (no network)', status: 'READY' },
];

function BandStrip({ mode, selected }: { mode: BaselineMode; selected: boolean }) {
  const [lo, hi] = BASELINES[mode].band;
  const x0 = (lo / 8000) * 100;
  const w = ((hi - lo) / 8000) * 100;
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="mt-3 h-9 w-full" aria-hidden="true">
      <line x1="0" y1="26" x2="100" y2="26" stroke="#D8D2C4" strokeWidth="0.6" />
      {[0, 25, 50, 75, 100].map((x) => (
        <line key={x} x1={x} y1="24" x2={x} y2="28" stroke="#D8D2C4" strokeWidth="0.5" />
      ))}
      {selected && (
        <rect x={x0} y="8" width={w} height="18" fill="#DCE6DF" rx="1">
          <animate attributeName="width" from="0" to={w} dur="0.4s" fill="freeze" />
          <animate attributeName="x" from={x0 + w / 2} to={x0} dur="0.4s" fill="freeze" />
        </rect>
      )}
      {!selected && <rect x={x0} y="8" width={w} height="18" fill="#EDE9E0" rx="1" />}
      {lo > 0 && (
        <line x1={x0} y1="6" x2={x0} y2="30" stroke="#A4453A" strokeWidth="0.6" strokeDasharray="2 1.4" />
      )}
      {hi < 8000 && (
        <line
          x1={x0 + w}
          y1="6"
          x2={x0 + w}
          y2="30"
          stroke="#A4453A"
          strokeWidth="0.6"
          strokeDasharray="2 1.4"
        />
      )}
      {mode === 'poor' &&
        Array.from({ length: 24 }, (_, i) => (
          <line
            key={i}
            x1={2 + i * 4}
            y1="31"
            x2={2 + i * 4}
            y2={31 + ((i * 7919) % 4)}
            stroke="#8A867A"
            strokeWidth="0.4"
          />
        ))}
    </svg>
  );
}

export default function Home() {
  const [clipA, setClipA] = useState<LoadedClip | null>(null);
  const [clipB, setClipB] = useState<LoadedClip | null>(null);
  const [errA, setErrA] = useState<string | null>(null);
  const [errB, setErrB] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<BaselineMode>('okay');
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [bundle, setBundle] = useState<AnalysisBundle | null>(null);
  const [sweepKey, setSweepKey] = useState(0);
  const [groundTruth, setGroundTruth] = useState<GroundTruth | null>(null);
  const scrollPending = useRef(false);

  const loadClip = useCallback(
    async (side: 'A' | 'B', blob: Blob, name: string, source: ClipMeta['source'], probe?: ProbeMeta) => {
      const setErr = side === 'A' ? setErrA : setErrB;
      const setClip = side === 'A' ? setClipA : setClipB;
      setErr(null);
      stopAll();
      try {
        const dec = await decodeAudio(blob);
        if (dec.samples.length < 1024) throw new Error('too short');
        // peak normalize once, up front
        let max = 0;
        for (let i = 0; i < dec.samples.length; i++) {
          const v = Math.abs(dec.samples[i]);
          if (v > max) max = v;
        }
        const g = max > 1e-8 ? 0.98 / max : 1;
        const raw = new Float32Array(dec.samples.length);
        for (let i = 0; i < dec.samples.length; i++) raw[i] = dec.samples[i] * g;
        setClip({
          name,
          duration: dec.duration,
          originalSampleRate: dec.originalSampleRate,
          samples: raw,
          raw,
          source,
          probe,
        });
      } catch {
        setErr("Couldn't decode this file. Try WAV, MP3, or M4A.");
      }
    },
    [],
  );

  const bothLoaded = Boolean(clipA && clipB);
  const scanAllowed = bothLoaded && (clipB?.duration ?? 0) >= 20;

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runAnalysis = async (withScan: boolean) => {
    if (!clipA || !clipB || running) return;
    setRunning(true);
    scrollPending.current = true;
    try {
      setStageIdx(0);
      setStage(STAGES[0]);
      await delay(140);
      setStageIdx(1);
      setStage(STAGES[1]);
      const procA = applyBaseline(clipA.raw, SR, baseline);
      const procB = applyBaseline(clipB.raw, SR, baseline);
      await delay(100);
      setStageIdx(2);
      setStage(STAGES[2]);
      await delay(40);
      const profA = analyzeClip(procA, SR, clipA.probe);
      setStageIdx(3);
      setStage(STAGES[3]);
      await delay(40);
      const profB = analyzeClip(procB, SR, clipB.probe);
      setStageIdx(4);
      setStage(STAGES[4]);
      await delay(40);
      const result = compareClips(profA, profB, baseline);

      let scan: { cells: ScanCell[]; duration: number } | null = null;
      if (withScan) {
        const win = 8 * SR;
        const hop = 4 * SR;
        const n = clipB.raw.length;
        const cells: ScanCell[] = [];
        for (let start = 0; start + 2 * SR <= n; start += hop) {
          const end = Math.min(n, start + win);
          if (end - start < 2 * SR) break;
          const slice = clipB.raw.slice(start, end);
          const prof = analyzeClip(applyBaseline(slice, SR, baseline), SR);
          const fp = relayFingerprint(prof);
          cells.push({ start_s: start / SR, end_s: end / SR, score: fp.score, state: fp.state });
          if (end === n) break;
        }
        scan = { cells, duration: clipB.duration };
      }

      setStageIdx(5);
      setStage(STAGES[5]);
      await delay(160);
      setBundle((prev) => ({
        result,
        rawA: clipA.raw,
        rawB: clipB.raw,
        procA,
        procB,
        sampleRate: SR,
        baseline,
        prevBaseline: prev ? prev.baseline : null,
        scan,
        metaA: {
          name: clipA.name,
          duration: clipA.duration,
          originalSampleRate: clipA.originalSampleRate,
          source: clipA.source,
          probe: clipA.probe,
        },
        metaB: {
          name: clipB.name,
          duration: clipB.duration,
          originalSampleRate: clipB.originalSampleRate,
          source: clipB.source,
          probe: clipB.probe,
        },
      }));
      setSweepKey((k) => k + 1);
    } finally {
      setRunning(false);
      setStage(null);
    }
  };

  useEffect(() => {
    if (bundle && scrollPending.current) {
      scrollPending.current = false;
      window.setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [bundle]);

  const hint = !bothLoaded
    ? 'Drop both clips to enable comparison.'
    : running
      ? `Analyzing… ${stage ?? ''}`
      : 'Ready — all signals computed locally.';

  return (
    <div>
      {/* ---------------------------------------------------------- hero -- */}
      <section className="mx-auto max-w-[1180px] px-6 pb-12 pt-24">
        <div className="max-w-[760px]">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: 24 }}
              transition={{ duration: 0.3 }}
              className="h-[2px] bg-green"
            />
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-green">
              A/B call comparison · second-hop relay forensics
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-5 text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink md:text-[56px]"
          >
            Did this call pass through a speakerphone twice?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="mt-6 text-[17px] leading-[1.65] text-ink-soft md:text-[19px]"
          >
            Drop a reference clip and a comparison clip. RelayGuard normalizes both to the selected
            channel baseline, then votes across four independent signals — speech-isolated voice
            match, relative channel thinness, the CNN relay detector, and a conversation cue — to
            decide whether Audio B shows the fingerprint of a second-hop speakerphone relay. All
            analysis runs locally in your browser; audio never leaves this page.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4 }}
            className="mt-6 flex flex-wrap gap-2"
          >
            {['7 signals', '0 servers', '4 demo clips'].map((c) => (
              <span
                key={c}
                className="rounded-full border border-hairline bg-canvas-bg px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft"
              >
                {c}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------- section 1 ------ */}
      <section className="mx-auto max-w-[1180px] px-6 py-12">
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-soft">
            1 · Audio clips
          </span>
          <span className="h-px flex-1 bg-hairline" />
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <DropzoneCard
            side="A"
            title="Reference call — Audio A"
            clip={clipA}
            baseline={baseline}
            baselineLabel={BASELINES[baseline].label}
            error={errA}
            otherLoaded={Boolean(clipB)}
            demos={DEMO_A}
            onBlob={(b, n, s, p) => void loadClip('A', b, n, s, p)}
            onRemove={() => {
              stopAll();
              setClipA(null);
            }}
          />
          <DropzoneCard
            side="B"
            title="Comparison clip — Audio B"
            clip={clipB}
            baseline={baseline}
            baselineLabel={BASELINES[baseline].label}
            error={errB}
            otherLoaded={Boolean(clipA)}
            demos={DEMO_B}
            onBlob={(b, n, s, p) => void loadClip('B', b, n, s, p)}
            onRemove={() => {
              stopAll();
              setClipB(null);
            }}
          />
        </div>
      </section>

      {/* ------------------------------------------------- section 2 ------ */}
      <section className="mx-auto max-w-[1180px] px-6 py-12">
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-soft">
            2 · Expected channel baseline
          </span>
          <span className="h-px flex-1 bg-hairline" />
        </div>
        <div role="radiogroup" aria-label="Expected channel baseline" className="mt-6 grid gap-4 md:grid-cols-3">
          {(Object.keys(BASELINES) as BaselineMode[]).map((mode, i) => {
            const info = BASELINES[mode];
            const selected = baseline === mode;
            return (
              <motion.button
                key={mode}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setBaseline(mode)}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20% 0px' }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className={`rounded-2xl border p-5 text-left transition-colors duration-150 ${
                  selected
                    ? 'border-[1.5px] border-green bg-green-tint'
                    : 'border-hairline bg-paper-deep hover:border-ink-faint'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-ink">{info.label}</span>
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                      selected ? 'border-green bg-green' : 'border-ink-faint bg-canvas-bg'
                    }`}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-paper" />}
                  </span>
                </div>
                <p className={`mt-2 text-[13px] leading-relaxed ${selected ? 'text-ink' : 'text-ink-soft'}`}>
                  {info.description}
                </p>
                <BandStrip mode={mode} selected={selected} />
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------- section 3 ------ */}
      <section className="mx-auto max-w-[1180px] px-6 py-12">
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-soft">
            3 · Compare
          </span>
          <span className="h-px flex-1 bg-hairline" />
        </div>
        <div className="mt-6 border-y border-hairline py-6">
          <div className="flex flex-wrap items-center gap-4">
            <motion.button
              type="button"
              disabled={!bothLoaded || running}
              onClick={() => void runAnalysis(false)}
              whileHover={bothLoaded && !running ? { scale: 1.02 } : undefined}
              whileTap={bothLoaded && !running ? { scale: 0.97 } : undefined}
              className={`rounded-[10px] px-8 py-3.5 text-[16px] font-medium transition-colors ${
                bothLoaded && !running
                  ? 'bg-green text-paper hover:bg-green-deep'
                  : 'cursor-not-allowed bg-paper-edge text-ink-faint'
              }`}
            >
              {running ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
                  Analyzing
                </span>
              ) : (
                'Compare'
              )}
            </motion.button>
            <motion.button
              type="button"
              disabled={!scanAllowed || running}
              onClick={() => void runAnalysis(true)}
              whileHover={scanAllowed && !running ? { scale: 1.02 } : undefined}
              whileTap={scanAllowed && !running ? { scale: 0.97 } : undefined}
              className={`rounded-[10px] border px-6 py-3.5 text-[15px] font-medium transition-colors ${
                scanAllowed && !running
                  ? 'border-hairline bg-canvas-bg text-ink hover:border-ink-faint'
                  : 'cursor-not-allowed border-hairline bg-paper-edge text-ink-faint'
              }`}
            >
              Scan B in intervals (20 s+)
            </motion.button>
            <span className="ml-auto font-mono text-[12px] text-ink-faint">{hint}</span>
          </div>
          <div className="mt-4 h-[2px] w-full overflow-hidden rounded bg-paper-edge">
            <div
              className="h-full bg-green transition-all duration-300"
              style={{ width: running ? `${((stageIdx + 1) / STAGES.length) * 100}%` : bundle ? '100%' : '0%' }}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ checklist ------- */}
      <section className="mx-auto max-w-[1180px] px-6 pb-16 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-25% 0px' }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-hairline bg-paper-deep px-5 py-4"
        >
          <div className="grid gap-x-10 md:grid-cols-2">
            {CHECKLIST.map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-25% 0px' }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                className="flex items-center gap-2.5 border-b border-hairline/60 py-2.5 last:border-0 md:[&:nth-last-child(2)]:border-0"
              >
                <CheckIcon className="h-4 w-4 shrink-0 text-green" strokeWidth={2} />
                <span className="text-[14px] text-ink">{row.label}</span>
                <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                  {row.status}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------ results --------- */}
      {bundle && (
        <Results
          bundle={bundle}
          sweepKey={sweepKey}
          onRerun={() => setSweepKey((k) => k + 1)}
          groundTruth={groundTruth}
          onGroundTruth={setGroundTruth}
        />
      )}
    </div>
  );
}
