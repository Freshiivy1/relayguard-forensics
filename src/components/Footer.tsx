import { Link } from 'react-router';
import { LogoMark } from './icons';

export default function Footer() {
  return (
    <footer className="border-t border-hairline bg-paper-deep">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-6 py-12 md:grid-cols-3 md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark width={24} height={24} />
            <span className="text-[16px] font-semibold text-ink">Relay Guard</span>
          </div>
          <p className="mt-3 font-serif text-[18px] italic leading-snug text-ink-soft">
            &ldquo;Verdicts are forensic cues, not proof.&rdquo;
          </p>
        </div>
        <nav className="flex gap-6 md:justify-center">
          {[
            { to: '/', label: 'Analyze' },
            { to: '/methodology', label: 'Methodology' },
            { to: '/about', label: 'About' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-green"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-ink-faint md:text-right">
          All analysis runs locally
          <br />
          Audio never leaves this page
        </p>
      </div>
    </footer>
  );
}
