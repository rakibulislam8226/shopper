import {
  type RegisterShopPayload,
  type ShopDocumentType,
  useRegisterShop,
  useUploadShopDocument,
} from '@api/shops';
import { BrandLogo } from '@components/layout/BrandLogo';
import { Button } from '@components/ui/Button';
import { useAuthStore, useIsAuthenticated } from '@stores/auth';
import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

const inputClasses =
  'rounded-lg border border-edge-strong bg-inset px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-500';

const DOCUMENT_TYPES: { value: ShopDocumentType; label: string }[] = [
  { value: 'owner_nid', label: 'Owner NID' },
  { value: 'trade_license', label: 'Trade License' },
  { value: 'tin_certificate', label: 'TIN Certificate' },
];

/**
 * Register the owner + shop (tokens issued right away), then offer to
 * attach approval documents before landing in the dashboard. The shop
 * starts PENDING regardless — documents are optional here and can be added
 * later; a superuser reviews and approves separately.
 */
export function SignupPage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const setSession = useAuthStore((state) => state.setSession);

  const registerShop = useRegisterShop();
  const uploadDocument = useUploadShopDocument();

  const [step, setStep] = useState<'register' | 'documents'>('register');
  const [shopUid, setShopUid] = useState('');

  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');

  const [files, setFiles] = useState<Partial<Record<ShopDocumentType, File>>>({});
  const [uploadedTypes, setUploadedTypes] = useState<Set<ShopDocumentType>>(new Set());

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: RegisterShopPayload = {
      owner_name: ownerName.trim(),
      phone: phone.trim(),
      password,
      shop_name: shopName.trim(),
    };
    registerShop.mutate(payload, {
      onSuccess: (response) => {
        const data = response.data;
        if (!data) return;
        setSession(data.user.name, data.tokens);
        setShopUid(data.shop.uid);
        setStep('documents');
      },
    });
  };

  const handleUpload = (type: ShopDocumentType) => {
    const file = files[type];
    if (!file) return;
    uploadDocument.mutate(
      { shopUid, type, file },
      { onSuccess: () => setUploadedTypes((prev) => new Set(prev).add(type)) },
    );
  };

  const finish = () => void navigate('/dashboard', { replace: true });

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <BrandLogo />
          <p className="text-sm text-slate-400">
            {step === 'register' ? 'Create your shop' : 'Submit approval documents'}
          </p>
        </div>

        {step === 'register' ? (
          <form
            onSubmit={handleRegister}
            className="flex flex-col gap-4 rounded-xl border border-edge-strong bg-card p-6"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-400">Your name</span>
              <input
                type="text"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                required
                autoComplete="name"
                autoFocus
                placeholder="Jane Doe"
                className={inputClasses}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-400">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                className={inputClasses}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-400">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                className={inputClasses}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-400">Shop name</span>
              <input
                type="text"
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
                required
                autoComplete="organization"
                placeholder="My Shop"
                className={inputClasses}
              />
            </label>

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={registerShop.isPending}
              loadingText="Creating your shop…"
              className="mt-1"
            >
              Sign up
            </Button>

            <p className="text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-edge-strong bg-card p-6">
            <p className="text-sm text-slate-400">
              Your shop is <span className="text-slate-200">pending review</span>. Submit these
              documents now to speed up approval — you can also add them later from settings.
            </p>

            {DOCUMENT_TYPES.map(({ value, label }) => {
              const isUploaded = uploadedTypes.has(value);
              return (
                <div key={value} className="flex items-center gap-2">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-xs font-medium text-slate-400">{label}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      disabled={isUploaded}
                      onChange={(event) =>
                        setFiles((prev) => ({ ...prev, [value]: event.target.files?.[0] }))
                      }
                      className="text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-200"
                    />
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant={isUploaded ? 'secondary' : 'primary'}
                    disabled={isUploaded || !files[value]}
                    isLoading={uploadDocument.isPending}
                    onClick={() => handleUpload(value)}
                    className="mt-5"
                  >
                    {isUploaded ? 'Uploaded' : 'Upload'}
                  </Button>
                </div>
              );
            })}

            <Button type="button" size="lg" fullWidth onClick={finish} className="mt-1">
              {uploadedTypes.size > 0 ? 'Continue' : 'Skip for now'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
