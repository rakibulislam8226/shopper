import { type ReactNode } from 'react';

/**
 * Placeholder for a section whose API does not exist yet. An honest empty
 * state beats a mocked-up table — nobody mistakes this for working software.
 */
export function EmptySection({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/70 bg-slate-800/25 px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-700/60 text-slate-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M12 8v5M12 16h.01M12 3l9 16H3l9-16z" />
        </svg>
      </span>
      <h2 className="text-base font-semibold text-slate-200">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}
