/**
 * Small status badge. The caller picks the tone rather than the pill guessing
 * from the label — "active" is positive for a membership, while
 * "discontinued" or "suspended" are the negative values elsewhere.
 */
export type StatusTone = 'positive' | 'negative' | 'neutral';

const TONE_CLASSES: Record<StatusTone, string> = {
  positive: 'bg-emerald-500/15 text-emerald-400',
  negative: 'bg-rose-500/15 text-rose-400',
  neutral: 'bg-slate-500/15 text-text-muted',
};

interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}
