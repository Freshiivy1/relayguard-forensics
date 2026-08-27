import SectionLabel from './SectionLabel';
import { useGsap, gsap, prefersReducedMotion } from './anim';

const STEPS = [
  {
    n: '01',
    title: 'Decode',
    desc: 'Any browser-supported audio format, decoded locally via Web Audio. Nothing is uploaded.',
  },
  {
    n: '02',
    title: 'Normalize',
    desc: 'Both clips are resampled to 16 kHz mono and shaped to the selected channel baseline — Good, Okay, or Poor.',
  },
  {
    n: '03',
    title: 'Gate',
    desc: 'A voice-activity detector isolates speech turns; every subsequent measurement is taken on speech, not silence.',
  },
  {
    n: '04',
    title: 'Measure',
    desc: 'Seven independent signals are computed: voice match, channel thinness, the CNN relay fingerprint, envelope dynamics, spectral smear, noise bed, and the conversation cue.',
  },
  {
    n: '05',
    title: 'Vote',
    desc: 'Weighted votes are fused into a single score → MATCH, SUSPICIOUS RELAY, or UNCERTAIN, with confidence.',
  },
];

export default function Pipeline() {
  const ref = useGsap<HTMLElement>((el) => {
    if (prefersReducedMotion()) return;
    const cards = el.querySelectorAll('[data-step]');
    const lines = el.querySelectorAll('[data-line]');
    gsap.set(cards, { opacity: 0, y: 24 });
    gsap.set(lines, { scaleX: 0 });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el.querySelector('[data-flow]'), start: 'top 75%', once: true },
    });
    // connecting hairline draws left→right behind the staggered steps
    tl.to(lines, { scaleX: 1, duration: 0.6, ease: 'power2.inOut', stagger: 0.12 }, 0);
    tl.to(cards, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.09 }, 0);
  });

  return (
    <section ref={ref} className="mx-auto max-w-[1180px] px-6 py-20 md:py-24">
      <SectionLabel index="01">The pipeline</SectionLabel>
      <h2
        data-reveal
        className="mt-5 max-w-[640px] text-[28px] font-semibold leading-tight tracking-[-0.01em] text-ink md:text-[34px]"
      >
        Five steps from two audio files to a verdict.
      </h2>
      <p data-reveal className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-ink-soft">
        Everything below runs in this page, on this device. The same pipeline produces the
        numbers quoted throughout this document.
      </p>

      <div data-flow className="mt-12 grid gap-4 md:grid-cols-5 md:gap-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="relative md:pr-4">
            {/* connector hairline with arrow tick (desktop) */}
            {i > 0 && (
              <span
                data-line
                aria-hidden="true"
                className="absolute -left-2 top-[26px] hidden h-px w-4 origin-left bg-hairline md:block"
              />
            )}
            <div
              data-step
              className="h-full rounded-2xl border border-hairline bg-paper-deep p-4"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] tabular text-ink-faint">{s.n}</span>
                <span
                  data-line
                  aria-hidden="true"
                  className="h-px flex-1 origin-left bg-hairline"
                />
                {i < STEPS.length - 1 ? (
                  <svg
                    aria-hidden="true"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="rotate-90 text-ink-faint md:rotate-0"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-green" aria-hidden="true" />
                )}
              </div>
              <h3 className="mt-3 text-[15px] font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
