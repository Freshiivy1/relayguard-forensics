// Shared inline SVG icon set (24x24 grid, 1.5px stroke, currentColor, rounded caps)
// plus the RelayGuard logo mark.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

function base(props: P): P {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...props,
  };
}

export function LogoMark(props: P) {
  // Two stacked green waveform bars over one red bar (64x64 viewBox).
  return (
    <svg width={28} height={28} viewBox="0 0 64 64" fill="none" {...props} aria-hidden="true">
      <rect x="8" y="12" width="8" height="14" rx="2" fill="#2F5B4C" />
      <rect x="20" y="8" width="8" height="22" rx="2" fill="#2F5B4C" />
      <rect x="32" y="14" width="8" height="12" rx="2" fill="#2F5B4C" />
      <rect x="44" y="10" width="8" height="18" rx="2" fill="#2F5B4C" />
      <rect x="10" y="34" width="8" height="8" rx="2" fill="#2F5B4C" />
      <rect x="22" y="32" width="8" height="11" rx="2" fill="#2F5B4C" />
      <rect x="34" y="35" width="8" height="7" rx="2" fill="#2F5B4C" />
      <rect x="46" y="33" width="8" height="10" rx="2" fill="#2F5B4C" />
      <rect x="14" y="50" width="26" height="6" rx="3" fill="#A4453A" />
    </svg>
  );
}

export function WaveUploadIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M3 12h2l2-5 3 10 3-14 3 12 2-6 1.5 3H22" />
    </svg>
  );
}

export function MicIcon(props: P) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function FolderIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

export function XIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function PlayIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

export function CheckIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

export function AlertTriangleIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M12 4L2.5 20h19L12 4z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.2v.3" />
    </svg>
  );
}

export function QuestionIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M8.5 9a3.5 3.5 0 1 1 5.4 2.9c-1.2.8-1.9 1.4-1.9 3.1" />
      <path d="M12 18.4v.3" />
    </svg>
  );
}

export function ChevronIcon(props: P) {
  return (
    <svg {...base(props)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function StopIcon(props: P) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  );
}

export function ProbeIcon(props: P) {
  // Speaker emitting shaped-noise rays (the active challenge probe).
  return (
    <svg {...base(props)}>
      <path d="M11 5L6.5 9H3.5v6h3L11 19V5z" />
      <path d="M14.5 9.5a4 4 0 0 1 0 5" />
      <path d="M17 7.5a7 7 0 0 1 0 9" />
      <path d="M19.5 5.5a10 10 0 0 1 0 13" strokeDasharray="2 2" />
    </svg>
  );
}
