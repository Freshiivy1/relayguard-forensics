import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { ComparisonResult, SignalVote } from '@/lib/audio/compare';
import type { VoicePanel, VoiceVerdict } from '@/lib/audio/voice';
import { CALIBRATION_NOTE } from '@/lib/audio/voiceCalibration';
import { CheckIcon, XIcon } from '@/components/icons';

interface Props {
  result: ComparisonResult;
}

const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : 'n/a');
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : 'n/a');
const hz = (v: number) =>
  Number.isFinite(v) ? `${Math.round(v).toLocaleString('en-US').replace(/,/g, ' ')} Hz` : 'n/a';
const db = (v: number) => (Number.isFinite(v) ? `${v.toFixed(1)} dB` : 'n/a');
const pct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : 'n/a');

interface MetricRow {
  label: string;
  a: string;
  b: string;
  note: string;
}

interface RowDef {
  id: string;
  title: string;
  weight: number;
  phrase: string;
  keyNumber: string;
  vote: SignalVote | undefined;
  rows: MetricRow[];
  unavailableNote?: string;
  /** red flag chips rendered next to the title when flags fired */
  flagChips?: string[];
}

function stateChip(state: string) {
  const cls =
    state === 'RED'
      ? 'bg-red-tint text-red-deep'
      : state === 'AMBER'
        ? 'bg-amber-tint text-amber-deep'
        : 'bg-green-tint text-green-deep';
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${cls}`}>{state}</span>
  );
}

function noiseChip(label: string) {
  const cls =
    label === 'very_noisy'
      ? 'bg-red-tint text-red-deep'
      : label === 'elevated'
        ? 'bg-amber-tint text-amber-deep'
        : 'bg-green-tint text-green-deep';
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${cls}`}>
      {label.replace('_', ' ')}
    </span>
  );
}

function verdictChip(v: VoiceVerdict) {
  const cls =
    v === 'same'
      ? 'border-green bg-green-tint text-green-deep'
      : v === 'different'
        ? 'border-red bg-red-tint text-red-deep'
        : 'border-hairline bg-paper-edge text-ink-faint';
  return (
    <span
      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${cls}`}
    >
      {v}
    </span>
  );
}

/** The calibrated 5-matcher voice-biometric panel, rendered inside the voice row. */
function VoicePanelBlock({
  panel,
  overridden,
  vetoed,
}: {
  panel: VoicePanel;
  overridden: boolean;
  vetoed: boolean;
}) {
  const head =
    panel.consensus === 'same'
      ? `${panel.agreeCount}/5 AGREE — SAME VOICE`
      : panel.consensus === 'different'
        ? `${panel.agreeCount}/5 AGREE — DIFFERENT VOICE`
        : 'NO CONSENSUS';
  const headCls =
    panel.consensus === 'same'
      ? 'text-green-deep'
      : panel.consensus === 'different'
        ? 'text-red-deep'
        : 'text-amber-deep';
  return (
    <div className="mt-3 rounded-lg border border-hairline bg-paper-edge p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint">
          Voice panel · 5 biometric matchers
        </span>
        <span className={`font-mono text-[12px] font-semibold uppercase tracking-[0.1em] ${headCls}`}>
          {head}
        </span>
        {panel.abstainCount > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
            {panel.abstainCount} abstain
          </span>
        )}
      </div>
      <div className="mt-2 overflow-hidden rounded-md border border-hairline/70">
        {panel.matchers.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-hairline/60 px-3 py-1.5 last:border-0"
            title={m.detail}
          >
            <span className="min-w-[170px] flex-1 text-[12px] text-ink-soft">{m.name}</span>
            <span className="font-mono text-[12px] text-ink tabular">
              p {Number.isFinite(m.p) ? m.p.toFixed(2) : 'n/a'}
            </span>
            <span className="font-mono text-[10px] text-ink-faint tabular">
              raw {Number.isFinite(m.raw) ? m.raw.toFixed(2) : 'n/a'}
            </span>
            {verdictChip(m.verdict)}
          </div>
        ))}
      </div>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-ink-faint">
        {panel.rule}
      </p>
      <p className="mt-1 font-mono text-[10px] leading-relaxed text-ink-faint">
        {CALIBRATION_NOTE}
      </p>
      {overridden && (
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-green-deep">
          voice consensus override — quality flags informational only
        </p>
      )}
      {vetoed && (
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-red-deep">
          different-voice veto — MATCH blocked regardless of channel similarity
        </p>
      )}
    </div>
  );
}

function ContributionBar({ vote }: { vote: SignalVote | undefined }) {
  if (!vote || !vote.available) {
    return (
      <div
        className="h-[6px] w-[72px] rounded-full"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #D8D2C4 0 2px, transparent 2px 6px)',
        }}
        title="Unavailable — contributes no vote"
      />
    );
  }
  const widthPct = Math.min(100, (vote.weight / 1.0) * 100 * Math.abs(vote.vote === 0 ? 0.35 : 1));
  const color = vote.vote > 0 ? 'bg-red' : vote.vote < 0 ? 'bg-green' : 'bg-hairline';
  return (
    <div className="h-[6px] w-[72px] overflow-hidden rounded-full bg-paper-edge" title={`weight ×${vote.weight} · vote ${vote.vote > 0 ? 'relay' : vote.vote < 0 ? 'match' : 'neutral'}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${widthPct}%` }} />
    </div>
  );
}

export default function EvidenceAccordion({ result }: Props) {
  const r = result;
  const voteOf = (id: string) => r.votes.find((v) => v.id === id);

  const rows: RowDef[] = [
    {
      id: 'voice',
      title: 'Voice match',
      weight: 0.6,
      phrase:
        r.voicePanel.consensus === 'same'
          ? `${r.voicePanel.agreeCount}/5 panel — same voice`
          : r.voicePanel.consensus === 'different'
            ? `${r.voicePanel.agreeCount}/5 panel — different voice`
            : r.voice.mfccCosine >= 0.62
              ? 'Same speaker plausible'
              : r.voice.mfccCosine <= 0.45
                ? 'Speaker identity doubtful'
                : 'Speaker identity open',
      keyNumber: `cos ${f2(r.voice.mfccCosine)}`,
      vote: voteOf('voice'),
      rows: [
        {
          label: 'MFCC cosine similarity (speech-isolated)',
          a: f2(r.voice.mfccCosine),
          b: '—',
          note: 'score 0–1 over gated segments',
        },
        {
          label: 'gated speech segments compared',
          a: String(r.voice.turnsA.length),
          b: String(r.voice.turnsB.length),
          note: `${r.voice.gatedSegments} paired turns`,
        },
        {
          label: 'F0 median',
          a: hz(r.voice.f0A.medianHz),
          b: hz(r.voice.f0B.medianHz),
          note: `semitone distance ${f1(r.voice.f0SemitoneDistance)}`,
        },
        {
          label: 'F0 p25–p75',
          a: Number.isFinite(r.voice.f0A.p25Hz)
            ? `${Math.round(r.voice.f0A.p25Hz)}–${Math.round(r.voice.f0A.p75Hz)} Hz`
            : 'n/a',
          b: Number.isFinite(r.voice.f0B.p25Hz)
            ? `${Math.round(r.voice.f0B.p25Hz)}–${Math.round(r.voice.f0B.p75Hz)} Hz`
            : 'n/a',
          note: 'inter-quartile range',
        },
        {
          label: 'voiced fraction',
          a: pct(r.voice.f0A.voicedFraction),
          b: pct(r.voice.f0B.voicedFraction),
          note: 'autocorrelation confidence > 0.3',
        },
        {
          label: 'pitch class',
          a: r.voice.f0A.pitchClass,
          b: r.voice.f0B.pitchClass,
          note: 'male-typical < 165 Hz · female-typical > 210 Hz',
        },
      ],
    },
    {
      id: 'channel',
      title: 'Channel thinness',
      weight: 1.0,
      phrase: r.channel.bThinnerThanA ? 'B thinner past margin' : 'Within baseline margin',
      keyNumber: `Δ ${r.channel.delta.toFixed(2)} / ${r.channel.margin.toFixed(2)}`,
      vote: voteOf('channel'),
      rows: [
        { label: 'spectral centroid', a: hz(r.channel.centroidA), b: hz(r.channel.centroidB), note: 'power-weighted mean frequency' },
        { label: 'p95 cumulative-energy frequency', a: hz(r.channel.p95A), b: hz(r.channel.p95B), note: '95% of energy below' },
        { label: 'p99 cumulative-energy frequency', a: hz(r.channel.p99A), b: hz(r.channel.p99B), note: '99% of energy below' },
        { label: 'energy < 300 Hz', a: pct(r.channel.sub300A), b: pct(r.channel.sub300B), note: 'sub-band fraction' },
        { label: 'energy > 3400 Hz', a: pct(r.channel.above3400A), b: pct(r.channel.above3400B), note: 'above-band leakage' },
        { label: 'energy > 4000 Hz', a: pct(r.channel.above4000A), b: pct(r.channel.above4000B), note: 'high-band leakage' },
        { label: 'in-band fraction (300–3400 Hz)', a: pct(r.channel.inbandA), b: pct(r.channel.inbandB), note: 'thinness score basis' },
        {
          label: 'thinness score',
          a: f2(r.channel.thinnessA),
          b: f2(r.channel.thinnessB),
          note: `delta ${r.channel.delta.toFixed(2)} vs margin ${r.channel.margin.toFixed(2)} (${r.baseline} mode)`,
        },
      ],
    },
    {
      id: 'spectral_integrity',
      title: 'Spectral integrity',
      weight: 0.75,
      phrase: !r.spectralIntegrity.available
        ? 'Unavailable'
        : r.spectralIntegrity.flags.length > 0
          ? r.spectralIntegrity.flags.map((f) => f.replace(/_/g, ' ')).join(' + ')
          : 'Low band intact on B',
      keyNumber: r.spectralIntegrity.available
        ? `${pct(r.spectralIntegrity.lowBandB)} vs ${pct(r.spectralIntegrity.lowBandA)}`
        : 'n/a',
      vote: voteOf('spectral_integrity'),
      unavailableNote: r.spectralIntegrity.available
        ? undefined
        : `UNAVAILABLE — ${r.spectralIntegrity.detail}`,
      flagChips: r.spectralIntegrity.flags.map((f) => f.replace(/_/g, ' ')),
      rows: [
        {
          label: `speech low-band fraction (${r.spectralIntegrity.bandHz[0]}–${r.spectralIntegrity.bandHz[1]} Hz)`,
          a: pct(r.spectralIntegrity.lowBandA),
          b: pct(r.spectralIntegrity.lowBandB),
          note:
            r.spectralIntegrity.bandHz[0] === 300
              ? '300–500 Hz low-inband — channel strips fundamentals (poor mode)'
              : '80–300 Hz fundamental region, VAD-gated speech frames',
        },
        {
          label: 'low-band drop (B vs A)',
          a: '—',
          b: Number.isFinite(r.spectralIntegrity.lowBandRelDrop)
            ? `${Math.round(r.spectralIntegrity.lowBandRelDrop * 100)}% rel · ${(r.spectralIntegrity.lowBandAbsDrop * 100).toFixed(1)} pp abs`
            : 'n/a',
          note: 'BASS_DEPLETED at ≥ 35% rel + ≥ 0.5 pp abs, or < 0.4% floor',
        },
        {
          label: 'speech spectral centroid',
          a: hz(r.spectralIntegrity.centroidA),
          b: hz(r.spectralIntegrity.centroidB),
          note: `drop ${Number.isFinite(r.spectralIntegrity.centroidRelDrop) ? Math.round(r.spectralIntegrity.centroidRelDrop * 100) : 0}% · SPEECH_THIN at ≥ 15%`,
        },
        {
          label: 'speech p95 rolloff',
          a: hz(r.spectralIntegrity.p95A),
          b: hz(r.spectralIntegrity.p95B),
          note: `drop ${Number.isFinite(r.spectralIntegrity.p95RelDrop) ? Math.round(r.spectralIntegrity.p95RelDrop * 100) : 0}% · SPEECH_THIN at ≥ 12%`,
        },
        {
          label: 'margins used',
          a: `channel ${r.channel.margin.toFixed(2)}`,
          b: `channel ${r.channel.margin.toFixed(2)}`,
          note: 'halved thinness margins · bass 35%/0.5 pp/0.4% floor · p95 12% · centroid 15%',
        },
        {
          label: 'flag state',
          a: '—',
          b: r.spectralIntegrity.flags.length > 0 ? r.spectralIntegrity.flags.join(' + ') : 'clean',
          note: r.flagVetoed
            ? 'FLAG VETO — MATCH blocked, verdict escalated'
            : r.flagOverride === 'voice_consensus'
              ? 'overridden by voice consensus (3/5+ same voice) — informational only'
              : 'any flag on B vetoes a clean MATCH',
        },
      ],
    },
    {
      id: 'relay',
      title: 'Relay fingerprint (heuristic)',
      weight: 0.5,
      phrase: r.relay.voteRelay ? 'B flagged above A' : 'No relay fingerprint gap',
      keyNumber: `${f2(r.relay.a.score)} → ${f2(r.relay.b.score)}`,
      vote: voteOf('relay'),
      rows: [
        {
          label: 'fused relay score (0–1)',
          a: f2(r.relay.a.score),
          b: f2(r.relay.b.score),
          note: 'B materially above A → relay vote',
        },
        {
          label: 'state',
          a: r.relay.a.state,
          b: r.relay.b.state,
          note: 'GREEN < 0.35 ≤ AMBER < 0.6 ≤ RED',
        },
        {
          label: 'flatness component',
          a: f2(r.relay.a.components.flatness),
          b: f2(r.relay.b.components.flatness),
          note: 'elevated spectral flatness',
        },
        {
          label: 'gap-contrast component',
          a: f2(r.relay.a.components.gapContrast),
          b: f2(r.relay.b.components.gapContrast),
          note: 'reduced gap–burst contrast',
        },
        {
          label: 'noise-bed component',
          a: f2(r.relay.a.components.noiseBed),
          b: f2(r.relay.b.components.noiseBed),
          note: 'noisier bed',
        },
        {
          label: '>3.4 kHz leakage component',
          a: f2(r.relay.a.components.hfLeakage),
          b: f2(r.relay.b.components.hfLeakage),
          note: 'speakerphone HF hash',
        },
        {
          label: 'fragmentation component',
          a: f2(r.relay.a.components.fragmentation),
          b: f2(r.relay.b.components.fragmentation),
          note: 'burst fragmentation',
        },
      ],
    },
    {
      id: 'envelope',
      title: 'Envelope dynamics',
      weight: 0.5,
      phrase: r.envelope.available
        ? r.envelope.dutyGated
          ? 'Duty cue gated in noise'
          : r.envelope.dutyDelta < -0.15
            ? 'B envelope compressed'
            : 'Envelope broadly comparable'
        : 'Unavailable',
      keyNumber: r.envelope.available ? `duty Δ ${r.envelope.dutyDelta >= 0 ? '+' : ''}${r.envelope.dutyDelta.toFixed(2)}` : 'n/a',
      vote: voteOf('envelope'),
      unavailableNote: r.envelope.available
        ? undefined
        : 'UNAVAILABLE — fewer than 2 speech bursts in at least one clip',
      rows: [
        { label: 'speech duty cycle', a: pct(r.envelope.dutyA), b: pct(r.envelope.dutyB), note: `delta ${r.envelope.dutyDelta >= 0 ? '+' : ''}${r.envelope.dutyDelta.toFixed(2)}` },
        { label: 'burst count', a: String(r.envelope.burstsA), b: String(r.envelope.burstsB), note: 'VAD segments' },
        { label: 'burst CV', a: f2(r.envelope.burstCVA), b: f2(r.envelope.burstCVB), note: 'duration variation' },
        { label: 'gap depth', a: db(r.envelope.gapDepthA), b: db(r.envelope.gapDepthB), note: 'gap level minus burst level' },
        { label: 'dynamic range', a: db(r.envelope.dynamicRangeA), b: db(r.envelope.dynamicRangeB), note: 'p95 − p10 frame dB' },
        ...(r.envelope.dutyGated
          ? [
              {
                label: 'duty cue gating',
                a: 'gated',
                b: 'gated',
                note: 'duty cue gated: unreliable in noise (sign flips) — bed is very_noisy, vote abstains',
              },
            ]
          : []),
      ],
    },
    {
      id: 'spectral_smear',
      title: 'Spectral smear',
      weight: r.probe.active ? 0.75 : 0.5,
      phrase:
        r.probe.active && Number.isFinite(r.a.probeBandFlatness) && Number.isFinite(r.b.probeBandFlatness)
          ? r.b.probeBandFlatness > r.a.probeBandFlatness * 1.8
            ? 'Probe band flatter on B'
            : 'No extra probe-band smear'
          : Number.isFinite(r.spectralSmear.flatnessDelta) && r.spectralSmear.flatnessDelta > 0
            ? 'B bursts spectrally flatter'
            : 'No extra smear on B',
      keyNumber: `Δ flat ${Number.isFinite(r.spectralSmear.flatnessDelta) ? (r.spectralSmear.flatnessDelta >= 0 ? '+' : '') + r.spectralSmear.flatnessDelta.toFixed(4) : 'n/a'}`,
      vote: voteOf('spectral_smear'),
      rows: [
        {
          label: 'spectral flatness on bursts',
          a: Number.isFinite(r.spectralSmear.flatnessA) ? r.spectralSmear.flatnessA.toFixed(4) : 'n/a',
          b: Number.isFinite(r.spectralSmear.flatnessB) ? r.spectralSmear.flatnessB.toFixed(4) : 'n/a',
          note: 'geometric/arithmetic mean ratio',
        },
        {
          label: 'probe-band flatness (non-speech)',
          a: Number.isFinite(r.a.probeBandFlatness) ? r.a.probeBandFlatness.toFixed(4) : 'n/a',
          b: Number.isFinite(r.b.probeBandFlatness) ? r.b.probeBandFlatness.toFixed(4) : 'n/a',
          note: `noisy-room benchmark: 0.1469 speaker vs 0.0034 direct (43×)${r.probe.active ? ' · probe on — cue weighted ×0.75' : ''}`,
        },
        {
          label: 'gap-vs-burst level',
          a: db(r.spectralSmear.gapBurstA),
          b: db(r.spectralSmear.gapBurstB),
          note: `delta ${Number.isFinite(r.spectralSmear.gapBurstDelta) ? (r.spectralSmear.gapBurstDelta >= 0 ? '+' : '') + r.spectralSmear.gapBurstDelta.toFixed(1) + ' dB' : 'n/a'}`,
        },
      ],
    },
    {
      id: 'noise_bed',
      title: 'Noise bed',
      weight: 0,
      phrase: 'Diagnostic — no vote',
      keyNumber: `SNR ${db(r.noiseBed.a.snrDb)} / ${db(r.noiseBed.b.snrDb)}`,
      vote: undefined,
      rows: [
        { label: 'SNR', a: db(r.noiseBed.a.snrDb), b: db(r.noiseBed.b.snrDb), note: 'speech dB − bed dB' },
        {
          label: 'speech-to-bed margin',
          a: db(r.noiseBed.a.speechToBedDb),
          b: db(r.noiseBed.b.speechToBedDb),
          note: '8.5 dB = speakerphone drowning · −67 dB bed = direct',
        },
        { label: 'noise bed (20th-pct frame)', a: db(r.noiseBed.a.bedDb), b: db(r.noiseBed.b.bedDb), note: 'quiet < −60 · elevated < −42' },
        { label: 'speech level', a: db(r.noiseBed.a.speechDb), b: db(r.noiseBed.b.speechDb), note: 'mean gated frame dB' },
        { label: 'label', a: r.noiseBed.a.label.replace('_', ' '), b: r.noiseBed.b.label.replace('_', ' '), note: 'quiet / elevated / very noisy' },
      ],
    },
    // PROBE — only when at least one clip was recorded under challenge noise
    ...(r.probe.active
      ? [
          {
            id: 'probe',
            title: 'Probe (challenge noise)',
            weight: 0.5,
            phrase:
              r.probe.b && Number.isFinite(r.probe.b.fidelity)
                ? r.probe.b.fidelity < 0.5
                  ? 'Probe arrived smeared on B'
                  : r.probe.b.fidelity >= 0.75
                    ? 'Probe arrived intact on B'
                    : 'Probe response ambiguous'
                : 'Probe fidelity unavailable',
            keyNumber:
              r.probe.b && Number.isFinite(r.probe.b.fidelity)
                ? `fidelity ${f2(r.probe.b.fidelity)}`
                : 'n/a',
            vote: voteOf('probe'),
            rows: [
              {
                label: 'challenge noise on',
                a: r.probe.a ? 'yes' : 'no',
                b: r.probe.b ? 'yes' : 'no',
                note: 'bass-free shaped noise, 500 Hz–6 kHz',
              },
              {
                label: 'probe seed',
                a: r.probe.a ? `0x${r.probe.a.seed.toString(16)}` : '—',
                b: r.probe.b ? `0x${r.probe.b.seed.toString(16)}` : '—',
                note: 'deterministic generator (mulberry32)',
              },
              {
                label: 'probe level',
                a: r.probe.a ? `${r.probe.a.level}%` : '—',
                b: r.probe.b ? `${r.probe.b.level}%` : '—',
                note: 'record-time slider setting',
              },
              {
                label: 'probe band',
                a: r.probe.a ? `${r.probe.a.band[0]}–${r.probe.a.band[1]} Hz` : '—',
                b: r.probe.b ? `${r.probe.b.band[0]}–${r.probe.b.band[1]} Hz` : '—',
                note: 'bass-free by design — the channel strips <300 Hz anyway',
              },
              {
                label: 'probe-band smear',
                a:
                  r.probe.a && Number.isFinite(r.probe.a.bandFlatness)
                    ? r.probe.a.bandFlatness.toFixed(4)
                    : '—',
                b:
                  r.probe.b && Number.isFinite(r.probe.b.bandFlatness)
                    ? r.probe.b.bandFlatness.toFixed(4)
                    : '—',
                note: 'anchors: 0.1469 speakerphone vs 0.0034 direct (43×)',
              },
              {
                label: 'probe response fidelity',
                a: r.probe.a ? f2(r.probe.a.fidelity) : '—',
                b: r.probe.b ? f2(r.probe.b.fidelity) : '—',
                note: 'Pearson vs expected probe spectrum · ≥0.75 direct · <0.5 smeared',
              },
              {
                label: 'fidelity state',
                a: r.probe.a ? r.probe.a.fidelityState : '—',
                b: r.probe.b ? r.probe.b.fidelityState : '—',
                note: 'GREEN ≥ 0.75 · AMBER 0.5–0.75 · RED < 0.5',
              },
            ],
          } satisfies RowDef,
        ]
      : []),
    {
      id: 'conversation',
      title: 'Conversation cue',
      weight: 0.5,
      phrase: r.conversation.sharedContentLikely ? 'Shared content likely' : 'Content link weak',
      keyNumber: `r ${f2(r.conversation.spectrumCorrelation)}`,
      vote: voteOf('conversation'),
      rows: [
        {
          label: 'long-term average spectrum correlation',
          a: f2(r.conversation.spectrumCorrelation),
          b: '—',
          note: 'Pearson on mean spectra · ≥ 0.72 → shared content likely',
        },
        {
          label: 'duty-cycle comparison',
          a: pct(r.conversation.dutyA),
          b: pct(r.conversation.dutyB),
          note: 'speech fraction per clip',
        },
        {
          label: 'turn-count comparison',
          a: String(r.conversation.turnsA),
          b: String(r.conversation.turnsB),
          note: 'speech turns per clip',
        },
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.55 }}
      className="rounded-2xl border border-hairline bg-paper-deep p-5"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
          Signal-by-signal evidence
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          Weights: channel ×1.0 · integrity ×0.75 · voice ×0.6 · relay ×0.5 · envelope ×0.5 · smear {r.probe.active ? '×0.75 (probe)' : '×0.5'} · conversation ×0.5{r.probe.active ? ' · probe ×0.5' : ''}
        </p>
      </div>

      <Accordion type="multiple" className="w-full">
        {rows.map((row) => (
          <AccordionItem key={row.id} value={row.id} className="border-hairline">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 pr-2 text-left">
                <span className="w-[190px] text-[13px] font-medium uppercase tracking-[0.14em] text-ink">
                  {row.title}
                </span>
                {row.flagChips?.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-red bg-red-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-red-deep"
                  >
                    ⚑ {f}
                  </span>
                ))}
                <span className="min-w-[140px] flex-1 text-[13px] text-ink-soft">{row.phrase}</span>
                <span className="font-mono text-[12px] text-ink-soft tabular">{row.keyNumber}</span>
                <ContributionBar vote={row.vote} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {row.unavailableNote ? (
                <p className="pb-3 font-mono text-[12px] italic text-ink-faint">{row.unavailableNote}</p>
              ) : null}
              <div className="overflow-hidden rounded-lg border border-hairline bg-paper-edge">
                <table className="w-full font-mono text-[12px] tabular">
                  <thead>
                    <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      <th className="px-3 py-2 font-medium">Metric</th>
                      <th className="px-3 py-2 font-medium">A</th>
                      <th className="px-3 py-2 font-medium">B</th>
                      <th className="hidden px-3 py-2 font-medium md:table-cell">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.rows.map((m) => (
                      <tr key={m.label} className="border-b border-hairline/60 last:border-0">
                        <td className="px-3 py-2 text-ink-soft">{m.label}</td>
                        <td className="px-3 py-2 text-green-deep">
                          {m.label === 'state' || (m.label === 'fidelity state' && m.a !== '—')
                            ? stateChip(m.a)
                            : m.label === 'label'
                              ? noiseChip(m.a.replace(' ', '_'))
                              : m.a}
                        </td>
                        <td className="px-3 py-2 text-red-deep">
                          {m.label === 'state' || (m.label === 'fidelity state' && m.b !== '—')
                            ? stateChip(m.b)
                            : m.label === 'label'
                              ? noiseChip(m.b.replace(' ', '_'))
                              : m.b}
                        </td>
                        <td className="hidden px-3 py-2 text-ink-faint md:table-cell">{m.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {row.id === 'voice' && (
                <VoicePanelBlock
                  panel={r.voicePanel}
                  overridden={r.flagOverride === 'voice_consensus'}
                  vetoed={r.voiceVeto}
                />
              )}
              {row.id === 'voice' && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.voice.turnsA.slice(0, 10).map((t, i) => (
                    <span
                      key={`a${i}`}
                      className="rounded-full border border-hairline bg-canvas-bg px-2 py-0.5 font-mono text-[10px] text-green-deep"
                    >
                      A{i + 1} {t.start_s.toFixed(1)}→{t.end_s.toFixed(1)}s
                    </span>
                  ))}
                  {r.voice.turnsB.slice(0, 10).map((t, i) => (
                    <span
                      key={`b${i}`}
                      className="rounded-full border border-hairline bg-canvas-bg px-2 py-0.5 font-mono text-[10px] text-red-deep"
                    >
                      B{i + 1} {t.start_s.toFixed(1)}→{t.end_s.toFixed(1)}s
                    </span>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
        {r.votes.every((v) => v.available) ? (
          <CheckIcon className="h-3.5 w-3.5 text-green" />
        ) : (
          <XIcon className="h-3.5 w-3.5 text-ink-faint" />
        )}
        {r.votes.filter((v) => v.available).length} of {r.votes.length} signals available for voting
      </div>
    </motion.div>
  );
}
