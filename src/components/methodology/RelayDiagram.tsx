import { useGsap, gsap, prefersReducedMotion } from './anim';

// Lucide-style 24px grid paths (1.5px stroke conventions) scaled into place.
const PHONE_PATH =
  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z';
const SPEAKER_BODY = 'M11 5 6 9H2v6h4l5 4V5z';
const SPEAKER_ARC_1 = 'M15.54 8.46a5 5 0 0 1 0 7.07';
const SPEAKER_ARC_2 = 'M19.07 4.93a10 10 0 0 1 0 14.14';
const GLOBE_ELLIPSE =
  'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z';

const Y = 300; // main signal-path line

function Handset({ cx, color, label }: { cx: number; color: string; label: string }) {
  return (
    <g data-node>
      <g transform={`translate(${cx - 30} ${Y - 30}) scale(2.5)`}>
        <path
          d={PHONE_PATH}
          fill="none"
          stroke={color}
          strokeWidth={0.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <text
        x={cx}
        y={Y + 66}
        textAnchor="middle"
        className="fill-ink-faint"
        fontFamily="'IBM Plex Mono', monospace"
        fontSize={11}
        letterSpacing={2}
      >
        {label}
      </text>
    </g>
  );
}

function NetworkNode({ cx, color }: { cx: number; color: string }) {
  return (
    <g data-node>
      <g transform={`translate(${cx - 30} ${Y - 30}) scale(2.5)`}>
        <circle cx={12} cy={12} r={10} fill="#F5F2EC" stroke={color} strokeWidth={0.7} />
        <path d="M2 12h20" fill="none" stroke={color} strokeWidth={0.7} />
        <path d={GLOBE_ELLIPSE} fill="none" stroke={color} strokeWidth={0.7} />
      </g>
      <text
        x={cx}
        y={Y + 66}
        textAnchor="middle"
        className="fill-ink-faint"
        fontFamily="'IBM Plex Mono', monospace"
        fontSize={11}
        letterSpacing={2}
      >
        NETWORK
      </text>
    </g>
  );
}

/**
 * Inline replica of `method-diagram-relay.svg`: handset → network (green) →
 * loudspeaker radiating in a room → second handset (red) → network.
 * Segments draw in sequence and a green dot travels the path once on load.
 */
export default function RelayDiagram() {
  const ref = useGsap<HTMLDivElement>((el) => {
    if (prefersReducedMotion()) return;
    const segs = el.querySelectorAll('[data-seg]');
    const nodes = el.querySelectorAll('[data-node]');
    const dot = el.querySelector('[data-dot]');
    gsap.set(segs, { strokeDashoffset: 1 });
    gsap.set(nodes, { opacity: 0, y: 12 });
    gsap.set(dot, { opacity: 0 });

    const tl = gsap.timeline({ delay: 0.35 });
    tl.to(nodes, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.12 }, 0);
    // 300ms per segment, ~900ms total for the three hop segments
    tl.to(
      segs,
      { strokeDashoffset: 0, duration: 0.3, ease: 'power1.inOut', stagger: 0.3 },
      0.15,
    );
    // green dot travels the whole path once (2s)
    tl.to(
      dot,
      { opacity: 1, duration: 0.15 },
      1.1,
    ).to(
      dot,
      { attr: { cx: 1032 }, duration: 2, ease: 'none' },
      1.1,
    ).to(dot, { opacity: 0, duration: 0.25 }, 3.0);
  });

  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox="0 0 1200 560"
        className="h-auto w-full"
        role="img"
        aria-label="Signal-path diagram: a caller's handset connects through the phone network (first hop, green), the audio is played by a loudspeaker into a room, re-captured by a second handset, and sent through the network again (second hop, red)."
      >
        {/* hop segments */}
        <line data-seg x1={168} y1={Y} x2={332} y2={Y} stroke="#2F5B4C" strokeWidth={1.5} pathLength={1} strokeDasharray={1} />
        <line data-seg x1={398} y1={Y} x2={518} y2={Y} stroke="#2F5B4C" strokeWidth={1.5} pathLength={1} strokeDasharray={1} />
        <line data-seg x1={682} y1={Y} x2={802} y2={Y} stroke="#A4453A" strokeWidth={1.5} strokeDasharray="5 5" />
        <line data-seg x1={878} y1={Y} x2={1032} y2={Y} stroke="#A4453A" strokeWidth={1.5} pathLength={1} strokeDasharray={1} />

        {/* room with loudspeaker */}
        <g data-node>
          <rect x={518} y={Y - 78} width={164} height={156} rx={10} fill="#EDE9E0" stroke="#D8D2C4" strokeWidth={1.5} />
          <g transform={`translate(${536} ${Y - 26}) scale(2.2)`}>
            <path d={SPEAKER_BODY} fill="none" stroke="#1C1B18" strokeWidth={0.8} strokeLinecap="round" strokeLinejoin="round" />
            <path d={SPEAKER_ARC_1} fill="none" stroke="#1C1B18" strokeWidth={0.8} strokeLinecap="round" />
            <path d={SPEAKER_ARC_2} fill="none" stroke="#1C1B18" strokeWidth={0.8} strokeLinecap="round" />
          </g>
          {/* reverb arcs filling the room */}
          <path d={`M 596 ${Y - 34} a 40 40 0 0 1 0 68`} fill="none" stroke="#8A867A" strokeWidth={1} strokeDasharray="3 4" />
          <path d={`M 612 ${Y - 48} a 56 56 0 0 1 0 96`} fill="none" stroke="#8A867A" strokeWidth={1} strokeDasharray="3 4" />
          {/* second microphone dot */}
          <circle cx={664} cy={Y} r={4} fill="#A4453A" />
        </g>

        {/* nodes */}
        <Handset cx={110} color="#2F5B4C" label="CALLER A" />
        <NetworkNode cx={365} color="#2F5B4C" />
        <Handset cx={845} color="#A4453A" label="CALLER B" />
        <NetworkNode cx={1095} color="#A4453A" />

        {/* hop labels */}
        <text x={250} y={Y + 108} textAnchor="middle" fill="#244A3D" fontFamily="'IBM Plex Mono', monospace" fontSize={12} letterSpacing={2.5}>
          FIRST HOP
        </text>
        <text x={600} y={Y + 134} textAnchor="middle" className="fill-ink-soft" fontFamily="'IBM Plex Mono', monospace" fontSize={12} letterSpacing={2.5}>
          ROOM + LOUDSPEAKER
        </text>
        <text x={955} y={Y + 108} textAnchor="middle" fill="#8A372D" fontFamily="'IBM Plex Mono', monospace" fontSize={12} letterSpacing={2.5}>
          SECOND HOP
        </text>

        {/* acoustic-capture annotation on the dashed segment */}
        <text x={742} y={Y - 18} textAnchor="middle" className="fill-ink-faint" fontFamily="'IBM Plex Mono', monospace" fontSize={10} letterSpacing={2}>
          AIR
        </text>

        {/* traveling dot */}
        <circle data-dot cx={168} cy={Y} r={5} fill="#2F5B4C" opacity={0} />
      </svg>
    </div>
  );
}
