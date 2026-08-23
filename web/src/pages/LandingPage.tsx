import { ButtonLink } from '@components/ui/Button';
import { type ReactNode } from 'react';

/**
 * Marketing entry point. Deliberately makes no API calls — a landing page that
 * depends on the backend being up is a landing page that breaks when it most
 * needs to load. Live service state lives on /health instead.
 */

interface Feature {
  title: string;
  description: string;
  icon: ReactNode;
}

/** 20×20 stroke icons, sized by the parent. */
const icon = {
  building: (
    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
  ),
  shield: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3zM9 12l2 2 4-4" />,
  box: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />,
  coins: (
    <path d="M12 7c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 4v6c0 1.7 3.6 3 8 3s8-1.3 8-3V4M4 10v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  ),
  history: <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5M12 7v5l3 2" />,
  scroll: (
    <path d="M6 3h9a3 3 0 0 1 3 3v12a3 3 0 0 0 3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 2-2.8M9 8h6M9 12h6M9 16h4" />
  ),
};

const FEATURES: Feature[] = [
  {
    title: 'Multi-tenant by design',
    description:
      'Every org-scoped row carries an indexed organization_id, and every query filters on it. Tenants cannot see each other, structurally.',
    icon: icon.building,
  },
  {
    title: 'Roles that actually gate',
    description:
      'Owner, manager, salesman — one membership per person per organization, promotions update the role rather than forking history.',
    icon: icon.shield,
  },
  {
    title: 'Stock that cannot go negative',
    description:
      'Inventory rules live in the database as CHECK constraints, not in a service method someone can forget to call.',
    icon: icon.box,
  },
  {
    title: 'Money you can reconcile',
    description:
      'Exact decimals everywhere, never floats. The unit price is frozen onto each sale, so a later price change cannot rewrite what a customer paid.',
    icon: icon.coins,
  },
  {
    title: 'History that survives',
    description:
      'Nothing is hard-deleted. Every foreign key restricts, statuses move instead of rows disappearing, and financial history stays intact.',
    icon: icon.history,
  },
  {
    title: 'An audit trail worth reading',
    description:
      'Append-only records of who changed what, with before and after snapshots — per organization, or platform-wide.',
    icon: icon.scroll,
  },
];

const STATS = [
  { value: 'Exact', label: 'decimal money math' },
  { value: 'Zero', label: 'cascading deletes' },
  { value: 'Append', label: 'only audit log' },
] as const;

function FeatureCard({ title, description, icon: glyph }: Feature) {
  return (
    <article className="group relative rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition-colors duration-200 hover:border-slate-700 hover:bg-slate-900/70">
      <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20 transition-colors group-hover:bg-indigo-500/15">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          {glyph}
        </svg>
      </span>
      <h3 className="mb-1.5 text-base font-semibold text-slate-100">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-400">{description}</p>
    </article>
  );
}

export function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
        {/* Ambient glow + grid. Pointer-events-none so it never eats a click. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.18),transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mask-[radial-gradient(ellipse_50%_40%_at_50%_0%,black,transparent)] bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-size-[56px_56px]"
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            Multi-tenant shop management
          </span>

          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            Run every shop from{' '}
            <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              one place
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-pretty text-slate-400 sm:text-lg">
            Organizations, staff roles, inventory and sales — with the correctness rules enforced by
            the database rather than trusted to whoever writes the next feature.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink to="/login" size="lg">
              Get started
            </ButtonLink>
            <ButtonLink to="/health" size="lg" variant="secondary">
              System status
            </ButtonLink>
          </div>

          <dl className="mt-14 grid w-full grid-cols-3 gap-4 border-t border-slate-800/80 pt-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <dt className="text-xl font-semibold text-slate-100 sm:text-2xl">{stat.value}</dt>
                <dd className="text-center text-xs text-slate-500">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section className="border-t border-slate-800/80 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Built on rules, not conventions
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
              Anything that would corrupt inventory or accounting is rejected by the schema itself,
              so a bug in a new feature cannot quietly cost money.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ---- Closing call to action ---- */}
      <section className="border-t border-slate-800/80 px-6 py-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 px-8 py-14 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(139,92,246,0.16),transparent_70%)]"
          />
          <div className="relative">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready when you are
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
              Sign in with the phone number your administrator registered.
            </p>
            <ButtonLink to="/login" size="lg" className="mt-8">
              Sign in to your account
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
