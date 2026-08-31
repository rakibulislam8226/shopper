import { useForgotPassword, useResetPassword, useVerifyResetOtp } from '@api/auth';
import { AuthInput } from '@components/auth/AuthInput';
import { SplitAuthCard } from '@components/auth/SplitAuthCard';
import { Button } from '@components/ui/Button';
import { CheckIcon, LockIcon, PhoneIcon } from '@components/ui/icons';
import { toFieldErrors } from '@lib/apiErrors';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import forgotPasswordShopImage from '@/assets/forgot-pass-shop.jpeg';

type Step = 'phone' | 'otp' | 'password' | 'done';

const STEP_COPY: Record<
  Step,
  { formTitle: string; formSubtitle: string; panelTitle: string; panelBody: string }
> = {
  phone: {
    formTitle: 'Reset your password',
    formSubtitle: 'Enter the phone number on your account',
    panelTitle: 'Forgot your password?',
    panelBody: "No problem — we'll send a verification code to get you back into your shop.",
  },
  otp: {
    formTitle: 'Check your phone',
    formSubtitle: 'Enter the code we sent you',
    panelTitle: 'Almost there',
    panelBody: 'The code only takes a couple of minutes to arrive — and to expire, so be quick.',
  },
  password: {
    formTitle: 'Set a new password',
    formSubtitle: 'Choose something you haven’t used before',
    panelTitle: 'One last step',
    panelBody: 'A strong, fresh password keeps your shop and your customers safe.',
  },
  done: {
    formTitle: 'Password reset',
    formSubtitle: 'You can now sign in with your new password',
    panelTitle: 'All set',
    panelBody: 'Your account is secured with your new password. Welcome back.',
  },
};

/**
 * Phone → OTP → new password, three steps in one page, sharing the same
 * split-panel look as sign-in/sign-up (`SplitAuthCard`) rather than the
 * plain centered card the rest of the app used to use. The OTP itself never
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

  const phoneFieldErrors = toFieldErrors(forgotPassword.error);
  const otpFieldErrors = toFieldErrors(verifyOtp.error);

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

  const { formTitle, formSubtitle, panelTitle, panelBody } = STEP_COPY[step];

  return (
    <SplitAuthCard
      panelTitle={panelTitle}
      panelBody={panelBody}
      panelImage={forgotPasswordShopImage}
    >
      <div className="mb-1">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">{formTitle}</h1>
        <p className="mt-1 text-sm text-text-muted">{formSubtitle}</p>
      </div>

      {step === 'phone' && (
        <form onSubmit={handleRequestOtp} className="mt-5 flex flex-col gap-4">
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
            error={phoneFieldErrors.phone}
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
            className="text-center text-xs font-medium text-text-muted hover:text-indigo-400"
          >
            Back to sign in
          </Link>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="mt-5 flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-text-muted">
            We sent a code to <span className="text-text-secondary">{phone}</span>. It expires in a
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
            error={otpFieldErrors.code}
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
              className="font-medium text-text-muted hover:text-text-secondary"
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
        <form onSubmit={handleResetPassword} className="mt-5 flex flex-col gap-4">
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
        <div className="mt-5 flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <CheckIcon className="h-5 w-5" />
          </span>
          <p className="text-sm leading-relaxed text-text-muted">
            Your password has been reset. Sign in with your new password to continue.
          </p>
          <Button
            type="button"
            size="lg"
            fullWidth
            onClick={() => void navigate('/login', { replace: true })}
            className="shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            Back to sign in
          </Button>
        </div>
      )}
    </SplitAuthCard>
  );
}
