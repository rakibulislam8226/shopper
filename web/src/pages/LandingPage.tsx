import { ButtonLink } from '@components/ui/Button';
import {
  BoxIcon,
  CoinsIcon,
  HistoryIcon,
  type IconProps,
  ScrollIcon,
  ShieldIcon,
  StoreIcon,
} from '@components/ui/icons';
import { type ComponentType } from 'react';

/**
 * Marketing entry point. Deliberately makes no API calls — a landing page that
 * depends on the backend being up is a landing page that breaks when it most
 * needs to load.
 */

interface Feature {
  title: string;
  description: string;
  icon: ComponentType<IconProps>;
}

const FEATURES: Feature[] = [
  {
    title: 'Multi-tenant by design',
    description:
      'Every org-scoped row carries an indexed organization_id, and every query filters on it. Tenants cannot see each other, structurally.',
    icon: StoreIcon,
  },
  {
    title: 'Roles that actually gate',
    description:
      'Owner, manager, salesman — one membership per person per organization, promotions update the role rather than forking history.',
    icon: ShieldIcon,
  },
  {
    title: 'Stock that cannot go negative',
    description:
      'Inventory rules live in the database as CHECK constraints, not in a service method someone can forget to call.',
    icon: BoxIcon,
  },
  {
    title: 'Money you can reconcile',
    description:
      'Exact decimals everywhere, never floats. The unit price is frozen onto each sale, so a later price change cannot rewrite what a customer paid.',
    icon: CoinsIcon,
  },
  {
    title: 'History that survives',
    description:
      'Nothing is hard-deleted. Every foreign key restricts, statuses move instead of rows disappearing, and financial history stays intact.',
    icon: HistoryIcon,
  },
  {
    title: 'An audit trail worth reading',
    description:
      'Append-only records of who changed what, with before and after snapshots — per organization, or platform-wide.',
    icon: ScrollIcon,
  },
];

const STATS = [
  { value: 'Exact', label: 'decimal money math' },
  { value: 'Zero', label: 'cascading deletes' },
  { value: 'Append', label: 'only audit log' },
] as const;

function FeatureCard({ title, description, icon: Icon }: Feature) {
  return (
    <article className="group relative rounded-2xl border border-edge-strong bg-card p-6 transition-colors duration-200 hover:border-brand-ring hover:bg-panel">
      <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-indigo-400 ring-1 ring-brand-ring transition-colors group-hover:bg-brand-hover/15">
        <Icon strokeWidth={1.6} className="h-5 w-5" />
      </span>
      <h3 className="mb-1.5 text-base font-semibold text-text-primary">{title}</h3>
      <p className="text-sm leading-relaxed text-text-muted">{description}</p>
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
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-edge-strong bg-panel px-3 py-1 text-xs font-medium text-text-secondary backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            Multi-tenant shop management
          </span>

          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            Run every shop from{' '}
            <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              one place
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-pretty text-text-muted sm:text-lg">
            Organizations, staff roles, inventory and sales — with the correctness rules enforced by
            the database rather than trusted to whoever writes the next feature.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink to="/login" size="lg">
              Get started
            </ButtonLink>
          </div>

          <dl className="mt-14 grid w-full grid-cols-3 gap-4 border-t border-edge pt-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <dt className="text-xl font-semibold text-text-primary sm:text-2xl">{stat.value}</dt>
                <dd className="text-center text-xs text-text-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section className="border-t border-edge px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Built on rules, not conventions
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted sm:text-base">
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
      <section className="border-t border-edge px-6 py-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-edge-strong bg-card px-8 py-14 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(139,92,246,0.16),transparent_70%)]"
          />
          <div className="relative">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready when you are
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-text-muted">
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
