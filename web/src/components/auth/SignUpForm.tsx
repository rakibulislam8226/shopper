import { type RegisterShopPayload, useRegisterShop } from '@api/shops';
import { AuthInput, LockIcon, PhoneIcon, StoreIcon, UserIcon } from '@components/auth/AuthInput';
import { Button } from '@components/ui/Button';
import { useAuthStore } from '@stores/auth';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * The sign-up half of `AuthCard` — owner + shop registration only. On
 * success it hands off to `/signup/documents`, outside the slider, for the
 * optional approval-document step.
 */
export function SignUpForm() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const registerShop = useRegisterShop();

  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopName, setShopName] = useState('');

  // Only nag once the visitor has actually typed a confirmation — flagging
  // an empty field as "mismatched" before they've had a chance to fill it
  // in reads as broken, not helpful.
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordsMismatch) return;

    const payload: RegisterShopPayload = {
      owner_name: ownerName.trim(),
      phone: phone.trim(),
      password,
      confirm_password: confirmPassword,
      shop_name: shopName.trim(),
    };
    registerShop.mutate(payload, {
      onSuccess: (response) => {
        const data = response.data;
        if (!data) return;
        setSession(data.user.name, data.tokens);
        void navigate('/signup/documents', {
          replace: true,
          state: { shopUid: data.shop.uid },
        });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">Create your shop</h1>
        <p className="mt-1 text-sm text-slate-400">Set up your account and start selling</p>
      </div>

      <AuthInput
        label="Your name"
        icon={<UserIcon />}
        type="text"
        value={ownerName}
        onChange={(event) => setOwnerName(event.target.value)}
        required
        autoComplete="name"
        placeholder="Jane Doe"
      />

      <AuthInput
        label="Phone number"
        icon={<PhoneIcon />}
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        required
        autoComplete="tel"
        placeholder="01XXXXXXXXX"
      />

      <AuthInput
        label="Password"
        icon={<LockIcon />}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />

      <AuthInput
        label="Confirm password"
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

      <AuthInput
        label="Shop name"
        icon={<StoreIcon />}
        type="text"
        value={shopName}
        onChange={(event) => setShopName(event.target.value)}
        required
        autoComplete="organization"
        placeholder="My Shop"
      />

      <Button
        type="submit"
        size="lg"
        fullWidth
        isLoading={registerShop.isPending}
        loadingText="Creating your shop…"
        className="mt-1 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
      >
        Create shop
      </Button>

      <p className="text-center text-xs text-slate-500 md:hidden">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
          Sign in
        </Link>
      </p>
    </form>
  );
}
