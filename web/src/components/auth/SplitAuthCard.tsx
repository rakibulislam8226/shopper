import { type ReactNode } from 'react';

interface SplitAuthCardProps {
  /** Headline on the gradient panel, e.g. "Forgot your password?" */
  panelTitle: string;
  /** Supporting copy under the panel title. */
  panelBody: string;
  /** Icon badge above the title. Defaults to a lock, fitting the password-reset flow. */
  panelIcon?: ReactNode;
  children: ReactNode;
}

/**
 * The split-panel shell shared by every forgot-password step: a fixed
 * gradient brand panel on the left, the active form on the right. Same
 * visual language as `AuthCard` (rounded card, sparkles, ambient glow) but
 * without the slide animation — forgot-password only ever shows one form at
 * a time, so there is nothing to slide between.
 */
export function SplitAuthCard({ panelTitle, panelBody, panelIcon, children }: SplitAuthCardProps) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.14),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mask-[radial-gradient(ellipse_50%_40%_at_50%_0%,black,transparent)] bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-size-[56px_56px]"
      />
      <div
        aria-hidden="true"
        className="animate-drift pointer-events-none absolute top-1/4 left-[8%] h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        style={{ animationDuration: '18s', animationDirection: 'reverse' }}
        className="animate-drift pointer-events-none absolute right-[10%] bottom-1/4 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl"
      />

      <div className="relative grid h-136 w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-edge-strong bg-card shadow-2xl shadow-black/30 md:grid-cols-2">
        {/* ---- Brand panel — fixed on the left, copy changes per step. ---- */}
        <div className="relative hidden md:block">
          <div className="relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden bg-linear-to-br from-indigo-600 via-indigo-500 to-purple-600 px-10 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/15 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-black/10 blur-3xl"
            />
            <SparkleIcon className="pointer-events-none absolute top-10 left-10 h-4 w-4 text-white/60" />
            <SparkleIcon className="pointer-events-none absolute right-14 bottom-16 h-3 w-3 text-white/40" />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20 backdrop-blur">
              {panelIcon ?? <LockIcon />}
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">{panelTitle}</h2>
            <p className="max-w-xs text-sm leading-relaxed text-white/85">{panelBody}</p>
          </div>
        </div>

        {/* ---- Form pane ---- */}
        <div className="flex flex-col justify-center px-8 py-10 sm:px-12">{children}</div>
      </div>
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
