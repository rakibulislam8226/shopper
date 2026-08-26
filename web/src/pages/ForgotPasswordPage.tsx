import { useForgotPassword, useResetPassword, useVerifyResetOtp } from '@api/auth';
import { AuthInput, LockIcon, PhoneIcon } from '@components/auth/AuthInput';
import { AuthShell } from '@components/auth/AuthShell';
import { Button } from '@components/ui/Button';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type Step = 'phone' | 'otp' | 'password' | 'done';

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  phone: { title: 'Reset your password', subtitle: 'Enter the phone number on your account' },
  otp: { title: 'Check your phone', subtitle: 'Enter the code we sent you' },
  password: { title: 'Set a new password', subtitle: 'Choose something you haven’t used before' },
  done: { title: 'Password reset', subtitle: 'You can now sign in with your new password' },
};

/**
 * Phone → OTP → new password, three steps in one page. The OTP itself never
 * leaves the phone step's response — verifying it returns a short-lived
 * `reset_token` that step three submits instead, so the code can't be
 * replayed against a different phone number client-side.
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const forgotPassword = useForgotPassword();
  const verifyOtp = useVerifyResetOtp();
  const resetPassword = useResetPassword();

  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleRequestOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    forgotPassword.mutate({ phone: phone.trim() }, { onSuccess: () => setStep('otp') });
  };

  const handleVerifyOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    verifyOtp.mutate(
      { phone: phone.trim(), code: code.trim() },
      {
        onSuccess: (response) => {
          const data = response.data;
          if (!data) return;
          setResetToken(data.reset_token);
          setStep('password');
        },
      },
    );
  };

  const handleResetPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordsMismatch) return;
    resetPassword.mutate(
      { reset_token: resetToken, new_password: newPassword, confirm_password: confirmPassword },
      { onSuccess: () => setStep('done') },
    );
  };

  const { title, subtitle } = STEP_COPY[step];

  return (
    <AuthShell title={title} subtitle={subtitle}>
      {step === 'phone' && (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
          <AuthInput
            label="Phone number"
            icon={<PhoneIcon />}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            autoComplete="tel"
            autoFocus
            placeholder="01XXXXXXXXX"
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={forgotPassword.isPending}
            loadingText="Sending code…"
            className="mt-1 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            Send code
          </Button>

          <Link
            to="/login"
            className="text-center text-xs font-medium text-slate-500 hover:text-indigo-400"
          >
            Back to sign in
          </Link>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-slate-400">
            We sent a code to <span className="text-slate-200">{phone}</span>. It expires in a
            couple of minutes.
          </p>

          <AuthInput
            label="Verification code"
            icon={<LockIcon />}
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            autoFocus
            placeholder="1234"
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={verifyOtp.isPending}
            loadingText="Verifying…"
            className="mt-1 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            Verify code
          </Button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="font-medium text-slate-500 hover:text-slate-300"
            >
              Change number
            </button>
            <button
              type="button"
              onClick={() => forgotPassword.mutate({ phone: phone.trim() })}
              disabled={forgotPassword.isPending}
              className="font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-60"
            >
              {forgotPassword.isPending ? 'Resending…' : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <AuthInput
            label="New password"
            icon={<LockIcon />}
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
            placeholder="At least 8 characters"
          />

          <AuthInput
            label="Confirm new password"
            icon={<LockIcon />}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Type it once more"
            error={passwordsMismatch ? "Passwords don't match" : undefined}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={resetPassword.isPending}
            loadingText="Resetting…"
            className="mt-1 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            Reset password
          </Button>
        </form>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <CheckIcon />
          </span>
          <p className="text-sm leading-relaxed text-slate-400">
            Your password has been reset. Sign in with your new password to continue.
          </p>
          <Button
            type="button"
            size="lg"
            fullWidth
            onClick={() => void navigate('/login', { replace: true })}
          >
            Back to sign in
          </Button>
        </div>
      )}
    </AuthShell>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
