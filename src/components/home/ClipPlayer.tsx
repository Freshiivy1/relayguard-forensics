// ClipPlayer.tsx — per-clip playback (original / channel-normalized) plus
// MP3 download buttons. Normalized audio reuses the exact channel model the
// analyzer uses (channel.ts applyBaseline), recomputed lazily on play.
import { useEffect, useRef, useState, type SVGProps } from 'react';
import { applyBaseline, type BaselineMode } from '@/lib/audio/channel';
import { encodeMp3, downloadBlob } from '@/lib/audio/export';
import {
  getPlayerState,
  subscribePlayer,
  playPcm,
  pausePcm,
  resumePcm,
  seekPcm,
  stopAll,
  type PlayerState,
} from '@/lib/audio/player';
import { PlayIcon } from '@/components/icons';
import type { ClipMeta } from './DropzoneCard';

const SR = 16000;

interface Props {
  side: 'A' | 'B';
  clip: ClipMeta;
  baseline: BaselineMode;
  baselineLabel: string;
}

type PlayAs = 'original' | 'normalized';

function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 5.5v13M15 5.5v13" />
    </svg>
  );
}

function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 4v11" />
      <path d="M7.5 11.5L12 16l4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </svg>
  );
}

function fmtTime(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest < 10 ? '0' : ''}${rest.toFixed(1)}`;
}

export default function ClipPlayer({ side, clip, baseline, baselineLabel }: Props) {
  const [playAs, setPlayAs] = useState<PlayAs>('original');
  const [state, setState] = useState<PlayerState>(() => getPlayerState());
  const normCache = useRef<{ baseline: BaselineMode; data: Float32Array } | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  const accent = side === 'A' ? 'green' : 'red';
  const key = `${side}-${playAs}`;

  useEffect(() => subscribePlayer(() => setState(getPlayerState())), []);

  // A different clip (or a removed clip) invalidates this player's audio.
  useEffect(() => {
    normCache.current = null;
    const k = getPlayerState().key;
    if (k && k.startsWith(`${side}-`)) stopAll();
  }, [clip.samples, side]);

  // Baseline change: drop the cached normalization; stop if it is playing.
  useEffect(() => {
    normCache.current = null;
    if (getPlayerState().key === `${side}-normalized`) stopAll();
  }, [baseline, side]);

  // Stop on unmount.
  useEffect(() => {
    return () => {
      const k = getPlayerState().key;
      if (k && k.startsWith(`${side}-`)) stopAll();
    };
  }, [side]);

  /** Decoded 16 kHz mono PCM for the current ORIGINAL/NORMALIZED selection. */
  const currentSamples = (mode: PlayAs): Float32Array => {
    if (mode === 'original') return clip.samples;
    if (!normCache.current || normCache.current.baseline !== baseline) {
      normCache.current = { baseline, data: applyBaseline(clip.samples, SR, baseline) };
    }
    return normCache.current.data;
  };

  const isMine = state.key === key;
  const isPlaying = isMine && state.playing;
  const position = isMine ? state.positionSec : 0;
  const duration = clip.duration;

  const togglePlay = () => {
    if (isPlaying) {
      pausePcm();
    } else if (isMine) {
      resumePcm();
    } else {
      playPcm(key, currentSamples(playAs), SR, 0);
    }
  };

  const selectPlayAs = (mode: PlayAs) => {
    if (mode === playAs) return;
    // Switching the source stops whatever is currently playing.
    stopAll();
    setPlayAs(mode);
  };

  const seekToFraction = (frac: number) => {
    const sec = Math.min(1, Math.max(0, frac)) * duration;
    if (isMine) {
      seekPcm(sec);
    } else {
      playPcm(key, currentSamples(playAs), SR, sec);
    }
  };

  const onBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    seekToFraction((e.clientX - rect.left) / rect.width);
  };

  const onBarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const sec = Math.min(duration, Math.max(0, position + (e.key === 'ArrowRight' ? 2 : -2)));
    if (isMine) seekPcm(sec);
    else playPcm(key, currentSamples(playAs), SR, sec);
  };

  const downloadMp3 = (mode: PlayAs) => {
    const blob = encodeMp3(currentSamples(mode), SR);
    const suffix = mode === 'original' ? 'original' : baseline;
    downloadBlob(`relayguard-${side}-${suffix}.mp3`, blob);
  };

  const pct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="mt-3 rounded-xl border border-hairline bg-canvas-bg p-3">
      {/* transport row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? `Pause audio ${side}` : `Play audio ${side}`}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-paper transition-colors ${
            accent === 'green' ? 'bg-green hover:bg-green-deep' : 'bg-red hover:bg-red-deep'
          }`}
        >
          {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
        </button>
        <span className="shrink-0 font-mono text-[11px] text-ink-soft tabular">
          {fmtTime(position)} / {fmtTime(duration)}
        </span>
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label={`Seek audio ${side}`}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration * 10) / 10}
          aria-valuenow={Math.round(position * 10) / 10}
          onClick={onBarClick}
          onKeyDown={onBarKeyDown}
          className="group flex h-4 min-w-0 flex-1 cursor-pointer items-center"
        >
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-paper-edge transition-colors group-hover:bg-hairline">
            <div
              className={`h-full rounded-full ${accent === 'green' ? 'bg-green' : 'bg-red'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-full border border-hairline font-mono text-[10px] uppercase tracking-[0.1em]">
          {(['original', 'normalized'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => selectPlayAs(m)}
              aria-pressed={playAs === m}
              className={`px-2.5 py-1 transition-colors ${
                playAs === m
                  ? accent === 'green'
                    ? 'bg-green text-paper'
                    : 'bg-red text-paper'
                  : 'bg-canvas-bg text-ink-soft hover:text-ink'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* download row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          Download:
        </span>
        <button
          type="button"
          onClick={() => downloadMp3('original')}
          className="flex items-center gap-1 rounded-full border border-hairline bg-canvas-bg px-2.5 py-1 font-mono text-[11px] text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
        >
          <DownloadIcon className="h-3 w-3" /> MP3 · original
        </button>
        <button
          type="button"
          onClick={() => downloadMp3('normalized')}
          className={`flex items-center gap-1 rounded-full border border-hairline bg-canvas-bg px-2.5 py-1 font-mono text-[11px] transition-colors ${
            accent === 'green'
              ? 'text-green-deep hover:border-green'
              : 'text-red-deep hover:border-red'
          }`}
        >
          <DownloadIcon className="h-3 w-3" /> MP3 · {baselineLabel}
        </button>
      </div>
    </div>
  );
}
