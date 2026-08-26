import { AuthShell } from '@components/auth/AuthShell';
import { ButtonLink } from '@components/ui/Button';

/**
 * Placeholder: there is no self-service reset flow yet (no email on file,
 * no SMS provider wired up). Points the owner at their administrator rather
 * than pretending a reset email was sent.
 */
export function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Self-service reset isn't available yet">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-indigo-400 ring-1 ring-brand-ring">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.6 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
          </svg>
        </span>

        <p className="text-sm leading-relaxed text-slate-400">
          Contact the owner or manager who set up your shop — they can reset your password from the
          staff settings.
        </p>

        <ButtonLink to="/login" variant="secondary" fullWidth>
          Back to sign in
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
