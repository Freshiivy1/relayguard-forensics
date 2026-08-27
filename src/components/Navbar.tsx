import { useState } from 'react';
import { NavLink, Link } from 'react-router';
import { LogoMark, XIcon } from './icons';

const LINKS = [
  { to: '/', label: 'Analyze' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-paper">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[18px] font-semibold tracking-tight text-ink">Relay Guard</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                [
                  'group relative text-[12px] font-medium uppercase tracking-[0.14em] transition-colors',
                  isActive ? 'text-green' : 'text-ink-soft hover:text-ink',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {l.label}
                  <span
                    className={[
                      'absolute -bottom-[3px] left-0 h-[2px] bg-green transition-all duration-150',
                      isActive ? 'w-full' : 'w-0 group-hover:w-full',
                    ].join(' ')}
                  />
                </>
              )}
            </NavLink>
          ))}
          <span className="rounded-full bg-green-tint px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-green-deep">
            100% client-side · no server
          </span>
        </nav>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-ink-soft md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {open ? (
            <XIcon className="h-5 w-5" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-hairline bg-paper md:hidden">
          <nav className="mx-auto flex max-w-[1180px] flex-col gap-1 px-6 py-4">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-2.5 text-[13px] font-medium uppercase tracking-[0.14em]',
                    isActive ? 'bg-green-tint text-green' : 'text-ink-soft',
                  ].join(' ')
                }
              >
                {l.label}
              </NavLink>
            ))}
            <span className="mt-2 self-start rounded-full bg-green-tint px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-green-deep">
              100% client-side · no server
            </span>
          </nav>
        </div>
      )}
    </header>
  );
}
