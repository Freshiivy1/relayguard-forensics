interface Props {
  index: string;
  children: string;
}

/** Numbered uppercase micro section label with a 24px green rule. */
export default function SectionLabel({ index, children }: Props) {
  return (
    <div data-reveal className="flex items-center gap-3">
      <span className="font-mono text-[11px] tabular tracking-[0.18em] text-ink-faint">
        {index}
      </span>
      <span className="h-px w-6 bg-green" aria-hidden="true" />
      <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-green">
        {children}
      </span>
    </div>
  );
}
