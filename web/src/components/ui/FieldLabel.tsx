import { InfoTooltip } from './InfoTooltip';

export function FieldLabel({
  children,
  required,
  hint,
}: {
  children: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-text-muted">
      {children}
      {required && <span className="text-rose-500">*</span>}
      {hint && <InfoTooltip text={hint} />}
    </span>
  );
}
