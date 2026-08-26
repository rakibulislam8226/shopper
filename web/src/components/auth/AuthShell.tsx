import { BrandLogo } from '@components/layout/BrandLogo';
import { type ReactNode } from 'react';

/**
 * Shared frame for every auth screen (login, signup, forgot password): the
 * ambient hero glow from the landing page, brand mark, a headline/subtitle
 * pair, and a fixed-width card slot. Keeps the auth pages visually part of
 * the same product rather than a bolted-on form.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
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

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandLogo />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-edge-strong bg-card p-6 shadow-2xl shadow-black/20 backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}
