import RelayDiagram from '@/components/methodology/RelayDiagram';
import Pipeline from '@/components/methodology/Pipeline';
import Signals from '@/components/methodology/Signals';
import Vote from '@/components/methodology/Vote';
import SpectrogramStudy from '@/components/methodology/SpectrogramStudy';
import CtaBand from '@/components/methodology/CtaBand';
import { useGsap, riseReveal } from '@/components/methodology/anim';

function Hero() {
  const ref = useGsap<HTMLElement>((el) => riseReveal(el, { y: 32, stagger: 0.1, start: null }));

  return (
    <section
      ref={ref}
      className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 pb-16 pt-24 lg:grid-cols-[minmax(0,760px)_1fr]"
    >
      <div>
        <div data-reveal className="flex items-center gap-3">
          <span className="h-px w-6 bg-green" aria-hidden="true" />
          <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-green">
            Methodology
          </span>
        </div>
        <h1
          data-reveal
          className="mt-5 text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink md:text-[48px]"
        >
          How a speakerphone leaves fingerprints.
        </h1>
        <p data-reveal className="mt-6 text-[17px] leading-[1.65] text-ink-soft md:text-[18px]">
          A second-hop relay happens when call audio is played out loud — over a speakerphone, a
          hands-free kit, another phone on a table — and re-captured by a second microphone
          before re-entering the network. The room, the loudspeaker, and the second telephony
          hop all stamp the audio. RelayGuard measures those stamps.
        </p>
        <p data-reveal className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Seven signals + active probe · weighted vote · 100% client-side
        </p>
      </div>
      <div data-reveal>
        <RelayDiagram />
      </div>
    </section>
  );
}

export default function Methodology() {
  return (
    <>
      <Hero />
      <Pipeline />
      <Signals />
      <Vote />
      <SpectrogramStudy />
      <CtaBand />
    </>
  );
}
