import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { useGsap, riseReveal } from './anim';

export default function CtaBand() {
  const ref = useGsap<HTMLElement>((el) => riseReveal(el, { y: 20, stagger: 0.15, start: 'top 82%' }));

  return (
    <section ref={ref} className="border-t border-hairline">
      <div className="mx-auto max-w-[760px] px-6 py-24 text-center">
        <p data-reveal className="font-serif text-[26px] italic leading-snug text-ink">
          &ldquo;The fastest way to understand the signals is to watch them disagree.&rdquo;
        </p>
        <div data-reveal className="mt-8">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="inline-block"
          >
            <Link
              to="/#results"
              className="inline-flex items-center gap-2.5 rounded-[10px] bg-green px-7 py-3.5 text-[15px] font-medium text-paper transition-colors hover:bg-green-deep"
            >
              Try it on the demo clips
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </motion.div>
        </div>
        <p
          data-reveal
          className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint"
        >
          Loads normal-direct as A · noisy-speakerphone as B · baseline Okay
        </p>
      </div>
    </section>
  );
}
