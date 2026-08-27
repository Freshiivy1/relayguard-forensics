import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { ComparisonResult } from '@/lib/audio/compare';
import { BASELINES, type BaselineMode } from '@/lib/audio/channel';
import type { ScanCell } from '@/lib/audio/render';
import { analyzeClip } from '@/lib/audio/features';
import {
  attachAudio,
  blobToBase64,
  buildAnalysisObject,
  downloadBlob,
  encodeMp3,
  fileStamp,
  formatBytes,
  GROUND_TRUTH_OPTIONS,
  type ClipExportMeta,
  type GroundTruth,
} from '@/lib/audio/export';
import { CheckIcon, AlertTriangleIcon, QuestionIcon } from '@/components/icons';
import WaveformPanel, { WAVEFORM_COLORS } from './WaveformPanel';
import SpectrogramPanel from './SpectrogramPanel';
import SpectralDiffStrip from './SpectralDiffStrip';
import BandChartPanel from './BandChartPanel';
import EvidenceAccordion from './EvidenceAccordion';
import ScanStrip from './ScanStrip';

export interface AnalysisBundle {
  result: ComparisonResult;
  rawA: Float32Array;
  rawB: Float32Array;
  procA: Float32Array;
  procB: Float32Array;
  sampleRate: number;
  baseline: BaselineMode;
  prevBaseline: BaselineMode | null;
  scan: { cells: ScanCell[]; duration: number } | null;
  metaA: ClipExportMeta;
  metaB: ClipExportMeta;
}

interface Props {
  bundle: AnalysisBundle;
  sweepKey: number;
  onRerun: () => void;
  groundTruth: GroundTruth | null;
  onGroundTruth: (g: GroundTruth | null) => void;
}

const VERDICT_STYLE = {
  MATCH: {
    bg: 'bg-green-tint',
    text: 'text-green-deep',
    bar: 'bg-green',
    sub: "B is consistent with A's channel.",
    Icon: CheckIcon,
  },
  'SUSPICIOUS RELAY': {
    bg: 'bg-red-tint',
    text: 'text-red-deep',
    bar: 'bg-red',
    sub: 'B shows additional second-hop degradation.',
    Icon: AlertTriangleIcon,
  },
  UNCERTAIN: {
    bg: 'bg-amber-tint',
    text: 'text-amber-deep',
    bar: 'bg-amber',
    sub: 'Signals disagree.',
    Icon: QuestionIcon,
  },
} as const;

export default function Results({ bundle, sweepKey, onRerun, groundTruth, onGroundTruth }: Props) {
  const r = bundle.result;
  const [view, setView] = useState<'normalized' | 'original'>('normalized');
  const [confWidth, setConfWidth] = useState(0);
  const [packBusy, setPackBusy] = useState(false);

  useEffect(() => {
    setConfWidth(0);
    const t = window.setTimeout(() => setConfWidth(r.confidence), 120);
    return () => window.clearTimeout(t);
  }, [r]);

  // ---- export data (all computed locally, lazily per analysis run) --------
  const rawProfiles = useMemo(
    () => ({
      a: analyzeClip(bundle.rawA, bundle.sampleRate, bundle.metaA.probe),
      b: analyzeClip(bundle.rawB, bundle.sampleRate, bundle.metaB.probe),
    }),
    [bundle],
  );

  const analysis = useMemo(
    () =>
      buildAnalysisObject({
        result: bundle.result,
        baseline: bundle.baseline,
        sampleRate: bundle.sampleRate,
        metaA: bundle.metaA,
        metaB: bundle.metaB,
        rawProfileA: rawProfiles.a,
        rawProfileB: rawProfiles.b,
        groundTruth,
        scan: bundle.scan,
      }),
    [bundle, rawProfiles, groundTruth],
  );

  const mp3s = useMemo(
    () => ({
      aOriginal: encodeMp3(bundle.rawA, bundle.sampleRate),
      aNormalized: encodeMp3(bundle.procA, bundle.sampleRate),
      bOriginal: encodeMp3(bundle.rawB, bundle.sampleRate),
      bNormalized: encodeMp3(bundle.procB, bundle.sampleRate),
    }),
    [bundle],
  );

  const analysisBytes = useMemo(() => JSON.stringify(analysis).length, [analysis]);
  const packBytes = useMemo(() => {
    const audioB64 =
      (mp3s.aOriginal.size + mp3s.aNormalized.size + mp3s.bOriginal.size + mp3s.bNormalized.size) *
      (4 / 3);
    return Math.ceil(analysisBytes + audioB64 + 512);
  }, [analysisBytes, mp3s]);

  const exportStamp = () => fileStamp(new Date(analysis.exported_at));

  const downloadAnalysisJson = () => {
    downloadBlob(
      `relayguard-analysis-${exportStamp()}.json`,
      new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' }),
    );
  };

  const downloadEvidencePack = async () => {
    if (packBusy) return;
    setPackBusy(true);
    try {
      const [aOriginalMp3, aNormalizedMp3, bOriginalMp3, bNormalizedMp3] = await Promise.all([
        blobToBase64(mp3s.aOriginal),
        blobToBase64(mp3s.aNormalized),
        blobToBase64(mp3s.bOriginal),
        blobToBase64(mp3s.bNormalized),
      ]);
      const pack = attachAudio(analysis, { aOriginalMp3, aNormalizedMp3, bOriginalMp3, bNormalizedMp3 });
      downloadBlob(
        `relayguard-evidence-pack-${exportStamp()}.json`,
        new Blob([JSON.stringify(pack)], { type: 'application/json' }),
      );
    } finally {
      setPackBusy(false);
    }
  };

  const style = VERDICT_STYLE[r.verdict];
  const baselineLabel = BASELINES[bundle.baseline].label;
  const samplesA = view === 'normalized' ? bundle.procA : bundle.rawA;
  const samplesB = view === 'normalized' ? bundle.procB : bundle.rawB;

  const ts = new Date(r.timestampIso);
  const stamp = `RUN ${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(
    ts.getDate(),
  ).padStart(2, '0')} ${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(
    2,
    '0',
  )}:${String(ts.getSeconds()).padStart(2, '0')} · BASELINE: ${baselineLabel.toUpperCase()}`;

  const explBlocks = r.explanation.match(/[^.]+\.(\s|$)/g) ?? [r.explanation];
  const third = Math.max(1, Math.ceil(explBlocks.length / 3));
  const blocks = [
    explBlocks.slice(0, third).join(' '),
    explBlocks.slice(third, third * 2).join(' '),
    explBlocks.slice(third * 2).join(' '),
  ].filter((s) => s.trim().length > 0);

  return (
    <section id="results" className="mx-auto max-w-[1180px] px-6 pb-24 pt-16">
      {/* section label */}
      <div className="flex items-center gap-4">
        <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-green">Results</span>
        <span className="h-px flex-1 bg-hairline" />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">{stamp}</span>
      </div>

      {/* verdict card */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6 grid gap-8 rounded-2xl border border-hairline bg-paper-deep p-8 md:grid-cols-[340px_1fr]"
      >
        <div>
          <motion.div
            key={r.timestampIso}
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className={`relative overflow-hidden rounded-2xl ${style.bg} px-6 py-8`}
          >
            <div className="flex items-center gap-3">
              <style.Icon className={`h-8 w-8 ${style.text}`} strokeWidth={2} />
              <span
                className={`text-[28px] font-semibold uppercase leading-none tracking-[0.14em] ${style.text}`}
              >
                {r.verdict}
              </span>
            </div>
            <p className={`mt-3 text-[14px] ${style.text}`}>{style.sub}</p>
            {(r.flags.length > 0 || r.flagVetoed || r.flagOverride || r.voiceVeto) && (
              <div className="mt-4 flex flex-wrap items-start gap-2">
                {r.voiceVeto && (
                  <span className="rounded-full border border-red-deep bg-red px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-paper">
                    ⚑ Different voice — MATCH blocked
                  </span>
                )}
                {r.flagOverride === 'voice_consensus' && (
                  <span className="rounded-full border border-green bg-green px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-paper">
                    ✓ Same voice — {r.voicePanel.agreeCount}/5 consensus
                  </span>
                )}
                {r.flags.includes('BASS_DEPLETED') && (
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="rounded-full border border-red bg-red-tint px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-red-deep">
                      ⚑ Bass depleted
                    </span>
                    {r.flagOverride === 'voice_consensus' && (
                      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">
                        overridden
                      </span>
                    )}
                  </span>
                )}
                {r.flags.includes('SPEECH_THIN') && (
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="rounded-full border border-amber bg-amber-tint px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-amber-deep">
                      ⚑ Speech thin
                    </span>
                    {r.flagOverride === 'voice_consensus' && (
                      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">
                        overridden
                      </span>
                    )}
                  </span>
                )}
                {r.flagVetoed && (
                  <span className="rounded-full border border-red-deep bg-red px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-paper">
                    ⚑ Flag veto — MATCH blocked
                  </span>
                )}
              </div>
            )}
          </motion.div>

          <div className="mt-5">
            <div className="h-[10px] w-full overflow-hidden rounded-full border border-hairline bg-canvas-bg">
              <div
                className={`h-full rounded-full ${style.bar} transition-all duration-700 ease-out`}
                style={{ width: `${confWidth}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">
              <span>Confidence</span>
              <span className="tabular">{r.confidence}%</span>
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint tabular">
              Weighted score {r.weightedScore.toFixed(2)} / 1.00 · votes {r.relayVotes} of {r.totalVotes} relay
            </p>
            {bundle.prevBaseline && bundle.prevBaseline !== bundle.baseline && (
              <p className="mt-2 font-mono text-[11px] text-amber-deep">
                Baseline changed from {BASELINES[bundle.prevBaseline].label.split(' — ')[0]} →{' '}
                {baselineLabel.split(' — ')[0]} · numbers re-computed
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <p className="font-serif text-[20px] italic leading-snug text-ink-soft">
            The full read-out, signal by signal:
          </p>
          <div className="mt-4 space-y-3">
            {blocks.map((b, i) => (
              <motion.p
                key={`${r.timestampIso}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.4 }}
                className="text-[16px] leading-[1.65] text-ink"
              >
                {b}
              </motion.p>
            ))}
          </div>
        </div>
      </motion.div>

      {/* scientific evidence header */}
      <div className="pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-green">
              Scientific evidence
            </p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.01em] text-ink">
              Everything the detector sees.
            </h2>
            <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-ink-soft">
              Everything below is computed in this page from the channel-normalized audio — exactly
              what the detector analyzes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded-full border border-hairline font-mono text-[10px] uppercase tracking-[0.1em]">
              {(['normalized', 'original'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setView(m)}
                  className={`px-3 py-1.5 transition-colors ${
                    view === m ? 'bg-green text-paper' : 'bg-canvas-bg text-ink-soft hover:text-ink'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={onRerun}
              className="rounded-[10px] border border-hairline bg-canvas-bg px-4 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
            >
              Re-run analysis
            </button>
          </div>
        </div>
      </div>

      {/* evidence panels */}
      <div className="mt-8 space-y-6">
        <WaveformPanel
          eyebrow={`A · Reference — ${view}`}
          badge={`${view === 'normalized' ? `Normalized to · ${baselineLabel}` : 'Original recording — unprocessed'}`}
          samples={samplesA}
          sampleRate={bundle.sampleRate}
          duration={samplesA.length / bundle.sampleRate}
          color={WAVEFORM_COLORS.A.color}
          turnTint={WAVEFORM_COLORS.A.tint}
          turns={r.a.vad.turns}
          revealKey={sweepKey}
        />
        <WaveformPanel
          eyebrow={`B · Comparison — ${view}`}
          badge={`${view === 'normalized' ? `Normalized to · ${baselineLabel}` : 'Original recording — unprocessed'}`}
          samples={samplesB}
          sampleRate={bundle.sampleRate}
          duration={samplesB.length / bundle.sampleRate}
          color={WAVEFORM_COLORS.B.color}
          turnTint={WAVEFORM_COLORS.B.tint}
          turns={r.b.vad.turns}
          revealKey={sweepKey}
        />

        <SpectrogramPanel
          eyebrow="Spectrogram — Audio A (0–4 kHz)"
          samples={samplesA}
          sampleRate={bundle.sampleRate}
          profile={r.a}
          accent="A"
          sweepKey={sweepKey}
          lowBandHz={r.spectralIntegrity.bandHz}
          flagged={false}
        />
        <SpectrogramPanel
          eyebrow="Spectrogram — Audio B (0–4 kHz)"
          samples={samplesB}
          sampleRate={bundle.sampleRate}
          profile={r.b}
          accent="B"
          sweepKey={sweepKey}
          lowBandHz={r.spectralIntegrity.bandHz}
          flagged={r.spectralIntegrity.flags.length > 0}
        />

        <SpectralDiffStrip a={r.a} b={r.b} integrity={r.spectralIntegrity} sweepKey={sweepKey} />

        <BandChartPanel channel={r.channel} baselineLabel={baselineLabel} sweepKey={sweepKey} />

        <EvidenceAccordion result={r} />

        {bundle.scan && <ScanStrip cells={bundle.scan.cells} duration={bundle.scan.duration} />}

        {/* ------------------------------------------------ export card -- */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-hairline bg-paper-deep p-6"
        >
          <div className="flex items-center gap-4">
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-green">
              Export
            </span>
            <span className="h-px flex-1 bg-hairline" />
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">
              Labeled training data — built locally
            </span>
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-[1fr_auto]">
            {/* ground truth */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                Ground-truth label <span className="text-ink-faint">(optional)</span>
              </p>
              <p className="mt-1 max-w-[420px] text-[13px] leading-relaxed text-ink-faint">
                What is this A/B pair, really? Your pick is embedded in the exports so they can be
                sent back as labeled training data.
              </p>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Ground-truth label">
                {GROUND_TRUTH_OPTIONS.map((opt) => {
                  const selected = groundTruth === opt.id;
                  const accent =
                    opt.id === 'direct_call' ? 'green' : opt.id === 'speakerphone_relay' ? 'red' : 'amber';
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onGroundTruth(selected ? null : opt.id)}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
                        selected
                          ? accent === 'green'
                            ? 'border-green bg-green text-paper'
                            : accent === 'red'
                              ? 'border-red bg-red text-paper'
                              : 'border-amber bg-amber text-paper'
                          : 'border-hairline bg-canvas-bg text-ink-soft hover:border-ink-faint hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* download buttons */}
            <div className="flex flex-col justify-end gap-2.5 md:items-end">
              <motion.button
                type="button"
                onClick={downloadAnalysisJson}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-[10px] bg-green px-5 py-2.5 text-[14px] font-medium text-paper transition-colors hover:bg-green-deep"
              >
                Download analysis JSON
              </motion.button>
              <motion.button
                type="button"
                disabled={packBusy}
                onClick={() => void downloadEvidencePack()}
                whileHover={packBusy ? undefined : { scale: 1.02 }}
                whileTap={packBusy ? undefined : { scale: 0.97 }}
                className={`rounded-[10px] border px-5 py-2.5 text-[14px] font-medium transition-colors ${
                  packBusy
                    ? 'cursor-wait border-hairline bg-paper-edge text-ink-faint'
                    : 'border-hairline bg-canvas-bg text-ink hover:border-ink-faint'
                }`}
              >
                {packBusy ? 'Packing evidence…' : 'Download evidence pack'}
                <span className="ml-2 font-mono text-[11px] text-ink-faint tabular">
                  ≈ {formatBytes(packBytes)}
                </span>
              </motion.button>
              <p className="font-mono text-[10px] text-ink-faint">
                Pack embeds both clips as base64 MP3 (original + normalized).
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
