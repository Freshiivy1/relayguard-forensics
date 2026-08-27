import { useRef, useState } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckIcon, AlertTriangleIcon, QuestionIcon, ChevronIcon } from '@/components/icons';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ---------------------------------- data ---------------------------------- */

const VERDICTS = [
  {
    name: 'MATCH',
    Icon: CheckIcon,
    bg: 'bg-green-tint',
    text: 'text-green-deep',
    desc: "B is consistent with A's channel after normalization. No measurable second-hop degradation. This means no relay was detected — not that none existed.",
  },
  {
    name: 'SUSPICIOUS RELAY',
    Icon: AlertTriangleIcon,
    bg: 'bg-red-tint',
    text: 'text-red-deep',
    desc: 'B shows additional degradation beyond the expected baseline, across multiple independent signals. This is corroborating evidence of a relay hop, not a determination of intent.',
  },
  {
    name: 'UNCERTAIN',
    Icon: QuestionIcon,
    bg: 'bg-amber-tint',
    text: 'text-amber-deep',
    desc: 'The signals disagree, or the clips are too short, too noisy, or too dissimilar to support a call. Treat the evidence readout, not the badge, as the result.',
  },
] as const;

const LIMITATIONS = [
  {
    title: 'Both clips can be relayed.',
    body: "If A itself passed through a speakerphone, thinness is measured relative to an already-degraded reference. The relay detector and noise bed still run per-clip, but the channel vote weakens.",
  },
  {
    title: 'Poor mode compresses the evidence.',
    body: 'On a 300–3400 Hz prison-phone baseline both clips are expected to be thin; the channel signal\u2019s margin widens (0.08, halved for strictness) and more weight effectively falls on voice, envelope, and smear. Bass is then judged from the 300–500 Hz low-inband, since the channel strips fundamentals.',
  },
  {
    title: 'Short clips abstain.',
    body: 'Under two speech bursts, envelope dynamics reports UNAVAILABLE and contributes no vote; very short clips also weaken the conversation cue. Confidence is reduced accordingly.',
  },
  {
    title: 'Same-device trickery.',
    body: 'A high-quality speakerphone in an anechoic room can produce a mild fingerprint; a noisy direct capture can mimic a mild one. Borderline cases land in UNCERTAIN by design.',
  },
  {
    title: 'It is not a speaker identifier.',
    body: 'Voice match is a consistency check across the two clips (score 0–1), tuned to ignore channel differences — it cannot and does not name a person.',
  },
  {
    title: 'Codec and dataset drift.',
    body: 'The relay detector was trained on common telephony chains (8 kHz mu-law, AMR-family codecs). Novel codecs or AI-vocoder pipelines may fall outside its calibration.',
  },
] as const;

const PRIVACY_ROWS = [
  { label: 'Audio upload to any server', status: 'NEVER' },
  { label: 'Analysis network requests', status: '0' },
  { label: 'Cookies / tracking', status: 'NONE' },
  { label: 'Model weights', status: 'BUNDLED · HTTP 200' },
  { label: 'Works offline after load', status: 'YES' },
] as const;

const FAQ = [
  {
    q: 'Why does the comparison depend on the baseline I choose?',
    a: "Because 'thin' is relative. Energy above 3.4 kHz is damning against a Good baseline, meaningless against a Poor one. Pick the channel the reference call was actually captured on.",
  },
  {
    q: 'Can I use two clips from different calls?',
    a: 'You can, but the voice match and conversation cue will (correctly) vote that the clips are unrelated, pushing toward UNCERTAIN.',
  },
  {
    q: 'What does the interval scan add?',
    a: 'It re-runs the relay detector over sliding windows of B. A relay that is only present for part of the clip shows up as RED windows in an otherwise GREEN timeline.',
  },
  {
    q: 'Why do the spectrograms stop at 4 kHz?',
    a: 'Telephony lives below 4 kHz. Everything the channel and relay signals measure happens in that band, so the display spends its resolution where the evidence is.',
  },
  {
    q: 'Can I export the evidence?',
    a: 'The evidence readout is plain numbers on the page; screenshot it or copy the values freely.',
  },
] as const;

/* ------------------------------ shared bits ------------------------------- */

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-green">
        {children}
      </span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}

/* ------------------------- FAQ accordion (Framer) ------------------------- */

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  const reduced = useReducedMotion();

  const list = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  };

  return (
    <motion.div
      variants={list}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      className="border-t border-hairline"
    >
      {FAQ.map((f, i) => {
        const isOpen = open === i;
        return (
          <motion.div key={f.q} variants={item} className="border-b border-hairline">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              id={`faq-trigger-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-6 py-5 text-left"
            >
              <span className="text-[18px] font-semibold leading-snug text-ink">{f.q}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.25 }}
                className="shrink-0 text-ink-faint"
              >
                <ChevronIcon className="h-5 w-5" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${i}`}
                  initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={
                    reduced
                      ? { duration: 0.15 }
                      : { type: 'spring', stiffness: 300, damping: 30 }
                  }
                  className="overflow-hidden"
                >
                  <p className="pb-6 pr-12 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* --------------------------------- page ----------------------------------- */

export default function About() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;

      /* S1 hero — on load */
      gsap.from('[data-hero]', {
        y: 32,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.1,
      });

      /* S2 verdict cards + badge pop */
      const verdictTl = gsap.timeline({
        scrollTrigger: { trigger: '[data-verdicts]', start: 'top 75%', once: true },
      });
      verdictTl
        .from('[data-verdict-card]', { y: 28, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 })
        .from(
          '[data-verdict-badge]',
          { scale: 0.92, duration: 0.5, ease: 'back.out(2.2)', stagger: 0.1 },
          '<0.15',
        );

      /* S3 limitation rows + mono counters */
      const limitTl = gsap.timeline({
        scrollTrigger: { trigger: '[data-limitations]', start: 'top 75%', once: true },
      });
      limitTl.from('[data-limit-row]', {
        y: 20,
        opacity: 0,
        duration: 0.55,
        ease: 'power3.out',
        stagger: 0.07,
      });
      gsap.utils.toArray<HTMLElement>('[data-limit-index]').forEach((el, i) => {
        const counter = { v: 0 };
        limitTl.to(
          counter,
          {
            v: i + 1,
            duration: 0.45,
            ease: 'none',
            onUpdate: () => {
              el.textContent = String(Math.round(counter.v)).padStart(2, '0');
            },
          },
          0.1 + i * 0.07,
        );
      });

      /* S4 privacy text + checklist rows with check-draw */
      const privTl = gsap.timeline({
        scrollTrigger: { trigger: '[data-privacy]', start: 'top 75%', once: true },
      });
      privTl
        .from('[data-privacy-text]', { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out' })
        .from(
          '[data-privacy-row]',
          { y: 14, opacity: 0, duration: 0.4, ease: 'power2.out', stagger: 0.07 },
          '<0.2',
        )
        .fromTo(
          '[data-check-path]',
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.4, ease: 'power1.inOut', stagger: 0.07 },
          '<0.1',
        );

      /* S5 responsible-use card + amber border draw */
      const respTl = gsap.timeline({
        scrollTrigger: { trigger: '[data-responsible]', start: 'top 70%', once: true },
      });
      respTl
        .from('[data-responsible-card]', { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out' })
        .fromTo(
          '[data-amber-bar]',
          { scaleY: 0 },
          { scaleY: 1, duration: 0.4, ease: 'power1.inOut', transformOrigin: 'top center' },
          '<0.1',
        );

      /* S7 CTA */
      gsap.from('[data-cta]', {
        scrollTrigger: { trigger: '[data-cta-band]', start: 'top 80%', once: true },
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.15,
      });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef}>
      {/* S1 — hero */}
      <section className="mx-auto max-w-[1180px] px-6 pb-12 pt-24">
        <div className="max-w-[760px]">
          <div data-hero className="flex items-center gap-3">
            <span className="h-px w-6 bg-green" />
            <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-green">
              About &amp; Limitations
            </span>
          </div>
          <h1
            data-hero
            className="mt-6 text-[48px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink"
          >
            Forensic cues, not proof.
          </h1>
          <p data-hero className="mt-6 text-[18px] leading-[1.65] text-ink-soft">
            RelayGuard is a measuring instrument. It reports whether a comparison clip carries the
            acoustic fingerprints of a second-hop speakerphone relay, relative to a reference clip
            and an expected channel baseline. It does not identify people, it does not detect lies,
            and it does not testify. Everything it computes is visible to you, number by number, on
            the results page.
          </p>
        </div>
      </section>

      {/* S2 — what a verdict means */}
      <section data-verdicts className="mx-auto max-w-[1180px] px-6 py-12">
        <SectionLabel>What a verdict means</SectionLabel>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {VERDICTS.map((v) => (
            <div
              key={v.name}
              data-verdict-card
              className="rounded-2xl border border-hairline bg-paper-deep p-6"
            >
              <div
                data-verdict-badge
                className={`flex items-center gap-2.5 rounded-xl ${v.bg} px-4 py-3.5`}
              >
                <v.Icon className={`h-5 w-5 ${v.text}`} strokeWidth={2} />
                <span
                  className={`text-[20px] font-semibold uppercase leading-none tracking-[0.14em] ${v.text}`}
                >
                  {v.name}
                </span>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* S3 — known limitations */}
      <section data-limitations className="mx-auto max-w-[1180px] px-6 py-12">
        <SectionLabel>Known limitations</SectionLabel>
        <div className="mt-8 border-b border-hairline">
          {LIMITATIONS.map((l, i) => (
            <div
              key={l.title}
              data-limit-row
              className="grid gap-2 border-t border-hairline py-6 md:grid-cols-[64px_260px_1fr] md:gap-8"
            >
              <span
                data-limit-index
                className="font-mono-rg text-[13px] font-medium text-ink-faint tabular"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-[16px] font-semibold leading-snug text-ink">{l.title}</h3>
              <p className="text-[14px] leading-relaxed text-ink-soft md:text-[15px]">{l.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* S4 — privacy model */}
      <section data-privacy className="mx-auto max-w-[1180px] px-6 py-12">
        <SectionLabel>Privacy</SectionLabel>
        <div className="mt-8 grid items-start gap-10 md:grid-cols-2">
          <p data-privacy-text className="text-[16px] leading-[1.65] text-ink-soft">
            There is no server. Audio is decoded in a sandboxed tab, resampled in memory, analyzed
            by bundled models, and discarded when you close or reload the page. The only network
            requests this app ever makes are for its own static files — fonts, model weights, and
            the four demo clips. You can verify this in your browser&rsquo;s network inspector:
            after the page loads, analysis produces zero requests.
          </p>
          <div className="rounded-2xl border border-hairline bg-paper-deep p-6">
            <p className="font-mono-rg text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Zero-network checklist
            </p>
            <div className="mt-4">
              {PRIVACY_ROWS.map((row) => (
                <div
                  key={row.label}
                  data-privacy-row
                  className="flex items-center gap-3 border-t border-hairline py-3 first:border-t-0 first:pt-0"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-green-tint">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 text-green-deep"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path
                        data-check-path
                        d="M4.5 12.5l5 5 10-11"
                        pathLength={1}
                        strokeDasharray={1}
                      />
                    </svg>
                  </span>
                  <span className="flex-1 text-[14px] text-ink">{row.label}</span>
                  <span className="font-mono-rg text-[11px] uppercase tracking-[0.08em] text-green-deep tabular">
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* S5 — responsible use */}
      <section data-responsible className="mx-auto max-w-[1180px] px-6 py-12">
        <SectionLabel>Responsible use</SectionLabel>
        <div
          data-responsible-card
          className="relative mt-8 overflow-hidden rounded-2xl border border-hairline bg-paper-deep p-6"
        >
          <span data-amber-bar className="absolute left-0 top-0 h-full w-[2px] bg-amber" />
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Do not present a RelayGuard verdict as evidence of wrongdoing on its own. Acoustic
            relay fingerprints indicate a capture path, not a motive. Recordings may be subject to
            consent laws in your jurisdiction — analyze only audio you are entitled to possess. If
            a result matters, corroborate it: the signal-by-signal readout exists precisely so a
            human can audit the machine.
          </p>
        </div>
      </section>

      {/* S6 — FAQ */}
      <section className="mx-auto max-w-[1180px] px-6 py-12">
        <SectionLabel>Questions</SectionLabel>
        <div className="mx-auto mt-8 max-w-[860px]">
          <FaqAccordion />
        </div>
      </section>

      {/* S7 — CTA band */}
      <section data-cta-band className="border-t border-hairline">
        <div className="mx-auto max-w-[1180px] px-6 py-24 text-center">
          <p
            data-cta
            className="font-serif-rg text-[26px] italic leading-snug text-ink"
          >
            &ldquo;Trust the numbers. Then check them.&rdquo;
          </p>
          <div data-cta className="mt-8">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-[10px] bg-green px-6 py-3 text-[14px] font-medium text-paper transition-colors duration-[120ms] hover:bg-green-deep"
              >
                Open the analyzer
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
