import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { WaveUploadIcon, MicIcon, FolderIcon, XIcon, PlayIcon, StopIcon } from '@/components/icons';
import { setupCanvas, drawWaveform } from '@/lib/audio/render';
import type { BaselineMode } from '@/lib/audio/channel';
import {
  startProbe,
  stopProbe,
  probeLevelDb,
  PROBE_BAND,
  PROBE_DEFAULT_LEVEL,
  PROBE_SEED,
  type ProbeMeta,
} from '@/lib/audio/probe';
import ClipPlayer from './ClipPlayer';

export interface ClipMeta {
  name: string;
  duration: number;
  originalSampleRate: number;
  samples: Float32Array;
  source: 'file' | 'demo' | 'recording';
  /** challenge-noise metadata — present only when recorded with the probe */
  probe?: ProbeMeta;
}

interface Props {
  side: 'A' | 'B';
  title: string;
  clip: ClipMeta | null;
  baseline: BaselineMode;
  baselineLabel: string;
  error: string | null;
  otherLoaded: boolean;
  demos: { label: string; url: string }[];
  onBlob: (blob: Blob, name: string, source: ClipMeta['source'], probe?: ProbeMeta) => void;
  onRemove: () => void;
}

function MiniWaveform({ samples, color }: { samples: Float32Array; color: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const c = setupCanvas(canvas);
    if (!c) return;
    drawWaveform(c, samples, 16000, { color, duration: samples.length / 16000, bare: true });
  }, [samples, color]);
  return (
    <canvas
      ref={ref}
      style={{ width: 120, height: 40, display: 'block' }}
      className="rounded-md border border-hairline bg-canvas-bg"
      aria-hidden="true"
    />
  );
}

export default function DropzoneCard(props: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  // Challenge noise: default ON for B (the suspect clip), OFF for A.
  const [probeOn, setProbeOn] = useState(props.side === 'B');
  const [probeLevel, setProbeLevel] = useState(PROBE_DEFAULT_LEVEL);
  const [probeActive, setProbeActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const prevClip = useRef<ClipMeta | null>(null);
  const probeMetaRef = useRef<ProbeMeta | null>(null);
  const reducedMotion = useReducedMotion();

  const accent = props.side === 'A' ? 'green' : 'red';
  const waveColor = props.side === 'A' ? '#2F5B4C' : '#A4453A';

  useEffect(() => {
    if (props.clip && props.clip !== prevClip.current) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 260);
      prevClip.current = props.clip;
      return () => window.clearTimeout(t);
    }
    prevClip.current = props.clip;
  }, [props.clip]);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) props.onBlob(f, f.name, 'file');
  };

  // Never leave the probe playing if the card unmounts mid-recording.
  useEffect(() => {
    return () => {
      stopProbe(true);
    };
  }, []);

  const toggleRecord = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      probeMetaRef.current = {
        on: probeOn,
        seed: PROBE_SEED,
        level: probeLevel,
        band: [PROBE_BAND[0], PROBE_BAND[1]],
      };
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopProbe();
        setProbeActive(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size > 0) {
          props.onBlob(
            blob,
            `Recording ${new Date().toLocaleTimeString()}`,
            'recording',
            probeMetaRef.current ?? undefined,
          );
        }
        probeMetaRef.current = null;
        setRecording(false);
        recorderRef.current = null;
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      if (probeMetaRef.current.on) {
        startProbe(probeMetaRef.current.level, probeMetaRef.current.seed);
        setProbeActive(true);
      }
    } catch {
      stopProbe(true);
      setProbeActive(false);
      probeMetaRef.current = null;
      setRecError('Microphone unavailable — check browser permissions.');
      setRecording(false);
    }
  };

  const loadDemo = async (url: string, label: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      props.onBlob(blob, url.split('/').pop() ?? label, 'demo');
    } catch {
      setRecError(`Couldn't fetch demo clip (${url}).`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20% 0px' }}
      transition={{ duration: 0.55 }}
      className={`flex min-h-[320px] flex-col rounded-2xl border bg-paper-deep p-6 transition-colors ${
        pulse
          ? props.side === 'A'
            ? 'border-green'
            : 'border-red'
          : 'border-hairline'
      }`}
    >
      {/* header */}
      <div className="flex items-center gap-3">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-[13px] font-bold text-paper ${
            accent === 'green' ? 'bg-green' : 'bg-red'
          }`}
        >
          {props.side}
        </span>
        <h3 className="text-[18px] font-semibold text-ink">{props.title}</h3>
      </div>

      {/* body */}
      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {!props.clip ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div
                role="button"
                tabIndex={0}
                aria-label={`Upload audio ${props.side}`}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  dragOver
                    ? `${accent === 'green' ? 'border-green bg-green/5' : 'border-red bg-red/5'} cursor-copy`
                    : 'border-hairline hover:border-ink-faint'
                }`}
              >
                <WaveUploadIcon
                  className={`h-8 w-8 transition-transform ${dragOver ? 'scale-110 text-ink-soft' : 'text-ink-faint'}`}
                />
                <p className="text-[15px] text-ink">Drag &amp; drop audio here</p>
                <p className="text-[13px] text-ink-faint">or</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      inputRef.current?.click();
                    }}
                    className="flex items-center gap-1.5 rounded-[10px] border border-hairline bg-canvas-bg px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
                  >
                    <FolderIcon className="h-4 w-4" /> Browse files
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleRecord();
                    }}
                    className={`flex items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      recording
                        ? 'border-red bg-red-tint text-red-deep'
                        : 'border-hairline bg-canvas-bg text-ink-soft hover:border-ink-faint hover:text-ink'
                    }`}
                  >
                    {recording ? <StopIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
                    {recording ? 'Stop' : 'Record'}
                  </button>
                </div>

                {/* challenge noise (probe) controls */}
                <div
                  className="mt-3 flex flex-col items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={probeOn}
                    onClick={() => setProbeOn((v) => !v)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                      probeOn
                        ? 'border-amber bg-amber-tint text-amber-deep'
                        : 'border-hairline bg-canvas-bg text-ink-faint hover:border-ink-faint hover:text-ink-soft'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`relative h-3 w-6 rounded-full transition-colors ${probeOn ? 'bg-amber' : 'bg-paper-edge'}`}
                    >
                      <span
                        className={`absolute top-[2px] h-2 w-2 rounded-full bg-paper transition-all ${
                          probeOn ? 'left-[14px]' : 'left-[2px]'
                        }`}
                      />
                    </span>
                    Challenge noise
                  </button>
                  {probeOn && (
                    <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      Level
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={probeLevel}
                        onChange={(e) => setProbeLevel(Number(e.target.value))}
                        className="h-1 w-24 cursor-pointer accent-amber"
                        aria-label="Challenge noise level"
                      />
                      <span className="w-8 text-right tabular text-ink-soft">{probeLevel}%</span>
                    </label>
                  )}
                  <p className="max-w-[300px] text-[11px] leading-snug text-ink-faint">
                    Plays a calibrated bass-free noise while recording — loud enough to interfere,
                    quiet enough not to mask speech.
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="audio/*,.m4a,.mp3,.wav,.ogg,.flac,.webm"
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* live probe indicator */}
              {recording && probeActive && (
                <div className="mt-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-amber-deep">
                  <motion.span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-amber"
                    animate={reducedMotion ? undefined : { opacity: [1, 0.25, 1] }}
                    transition={reducedMotion ? undefined : { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="tabular">
                    Probe playing ·{' '}
                    {Number.isFinite(probeLevelDb(probeLevel))
                      ? `−${Math.abs(probeLevelDb(probeLevel)).toFixed(1)}`
                      : '−∞'}{' '}
                    dB rel
                  </span>
                </div>
              )}

              {/* demo row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  Try a demo:
                </span>
                {props.demos.map((d) => (
                  <button
                    key={d.url}
                    type="button"
                    onClick={() => void loadDemo(d.url, d.label)}
                    className={`flex items-center gap-1 rounded-full border border-hairline bg-canvas-bg px-2.5 py-1 font-mono text-[11px] transition-colors ${
                      accent === 'green'
                        ? 'text-green-deep hover:border-green'
                        : 'text-red-deep hover:border-red'
                    }`}
                  >
                    <PlayIcon className="h-3 w-3" /> {d.label}
                  </button>
                ))}
              </div>
              {props.otherLoaded && (
                <p className="mt-2 font-mono text-[11px] italic text-ink-faint">
                  Waiting for the other clip…
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="loaded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex h-full flex-col"
            >
              <div className="flex items-center gap-3 rounded-xl border border-hairline bg-canvas-bg p-3">
                <MiniWaveform samples={props.clip.samples} color={waveColor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[12px] text-ink">{props.clip.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-faint tabular">
                    {props.clip.duration.toFixed(2)} s · src {Math.round(props.clip.originalSampleRate / 100) / 10} kHz
                    → 16 kHz mono
                  </p>
                </div>
                <button
                  type="button"
                  onClick={props.onRemove}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-ink-faint transition-colors hover:bg-paper-edge hover:text-red-deep"
                >
                  <XIcon className="h-4 w-4" /> Remove
                </button>
              </div>
              <ClipPlayer
                side={props.side}
                clip={props.clip}
                baseline={props.baseline}
                baselineLabel={props.baselineLabel}
              />
              {recording && (
                <p className="mt-2 font-mono text-[11px] text-red-deep">Recording…</p>
              )}
              {!props.otherLoaded && (
                <p className="mt-2 font-mono text-[11px] italic text-ink-faint">
                  Waiting for the other clip…
                </p>
              )}
              <div className="mt-auto pt-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(props.error || recError) && (
        <p className="mt-2 text-[13px] text-red-deep">{props.error ?? recError}</p>
      )}

      {/* footer */}
      <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3 font-mono text-[11px] text-ink-faint">
        <span>Plays as: {props.baselineLabel}</span>
        <span className="hidden sm:inline">Original recording — unprocessed</span>
      </div>
    </motion.div>
  );
}
