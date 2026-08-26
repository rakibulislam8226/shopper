import { BrandMarkIcon, SparkleIcon } from '@components/ui/icons';
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type AuthMode = 'signin' | 'signup';

interface AuthCardProps {
  mode: AuthMode;
  signIn: ReactNode;
  signUp: ReactNode;
}

const BRAND_COPY: Record<AuthMode, { title: string; body: string; to: string; cta: string }> = {
  signin: {
    title: 'New here?',
    body: 'Create a shop in minutes — inventory, staff roles, and sales, all in one place.',
    to: '/signup',
    cta: 'Create an account',
  },
  signup: {
    title: 'Welcome back',
    body: 'Sign in to pick up where you left off — your shop is waiting.',
    to: '/login',
    cta: 'Sign in instead',
  },
};

/**
 * The sign-in/sign-up slider: one wide card holding both forms side by side,
 * with a curved brand panel that slides across to cover whichever form is
 * inactive. `mode` drives which side is exposed — `AuthPage` derives it from
 * the URL, so /login and /signup stay real, bookmarkable routes even though
 * the transition never unmounts either form.
 */
export function AuthCard({ mode, signIn, signUp }: AuthCardProps) {
  const isSignUp = mode === 'signup';
  const copy = BRAND_COPY[mode];

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
      {/* Soft ambient blobs drifting behind the card — the bit of motion that
          keeps the page from reading as a static, corporate form. */}
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
        {/* ---- Form layer: both forms always mounted, cross-faded by mode. ---- */}
        <div className="relative col-span-1 md:col-span-2 md:grid md:grid-cols-2">
          <FormPane active={mode === 'signin'} side="left">
            {signIn}
          </FormPane>
          <FormPane active={mode === 'signup'} side="right">
            {signUp}
          </FormPane>
        </div>

        {/* ---- Brand panel: slides over whichever side is inactive. ---- */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 hidden w-1/2 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] md:block ${
            isSignUp ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
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
            <span className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20 backdrop-blur">
              <BrandMarkIcon className="h-6 w-6" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">{copy.title}</h2>
            <p className="max-w-xs text-sm leading-relaxed text-white/85">{copy.body}</p>
            <Link
              to={copy.to}
              className="pointer-events-auto mt-2 inline-flex items-center justify-center rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-white/10 active:scale-[0.98]"
            >
              {copy.cta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One form's slot. On mobile the brand panel is hidden and forms stack, so
 * `active` there just toggles visibility; on desktop the brand panel handles
 * the visual transition and both sides stay laid out side by side underneath.
 */
function FormPane({
  active,
  side,
  children,
}: {
  active: boolean;
  side: 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col justify-center px-8 py-10 sm:px-12 ${
        active ? 'flex' : 'hidden md:flex'
      } ${side === 'right' ? 'md:col-start-2' : 'md:col-start-1'}`}
    >
      <div
        className={`transition-opacity duration-300 ${active ? 'opacity-100 delay-150' : 'opacity-0 md:pointer-events-none'}`}
      >
        {children}
      </div>
    </div>
  );
}
