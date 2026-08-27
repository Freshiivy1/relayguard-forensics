// Shared animation helpers for the Methodology page.
// GSAP + ScrollTrigger own all scroll-driven reveals here; Framer Motion is
// used only in leaf components for hover/tap micro-interactions.
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Run a GSAP setup scoped to a root element. Cleanup is automatic via
 * gsap.context revert. The setup callback should no-op when
 * prefersReducedMotion() is true so content renders in its final state.
 */
export function useGsap<T extends HTMLElement>(
  setup: (el: T) => void,
  deps: readonly unknown[] = [],
) {
  const ref = useRef<T | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => setup(ref.current as T), ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Standard rise-and-fade reveal for `[data-reveal]` children. */
export function riseReveal(
  el: HTMLElement,
  opts: { y?: number; stagger?: number; start?: string | null; duration?: number } = {},
) {
  const items = el.querySelectorAll('[data-reveal]');
  if (!items.length) return;
  if (prefersReducedMotion()) return;
  gsap.set(items, { opacity: 0, y: opts.y ?? 32 });
  gsap.to(items, {
    opacity: 1,
    y: 0,
    duration: opts.duration ?? 0.8,
    ease: 'power3.out',
    stagger: opts.stagger ?? 0.1,
    scrollTrigger:
      opts.start === null
        ? undefined
        : { trigger: el, start: opts.start ?? 'top 80%', once: true },
  });
}
