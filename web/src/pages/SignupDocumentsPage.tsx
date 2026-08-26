import { type RegisterShopPayload, type ShopDocumentType, useRegisterShop } from '@api/shops';
import { AuthShell } from '@components/auth/AuthShell';
import { type SignupDetails } from '@components/auth/SignUpForm';
import { Button } from '@components/ui/Button';
import { useAuthStore, useIsAuthenticated } from '@stores/auth';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

interface DocumentField {
  key: 'ownerNid' | 'tradeLicense' | 'tinCertificate' | 'otherDocument';
  type: ShopDocumentType;
  label: string;
  required?: boolean;
}

const DOCUMENT_FIELDS: DocumentField[] = [
  { key: 'ownerNid', type: 'owner_nid', label: 'Owner NID', required: true },
  { key: 'tradeLicense', type: 'trade_license', label: 'Trade License' },
  { key: 'tinCertificate', type: 'tin_certificate', label: 'TIN Certificate' },
  { key: 'otherDocument', type: 'other', label: 'Other document' },
];

/**
 * Step 2 of signup: attach the owner NID (required) and any optional
 * supporting documents, then fire the single `POST /shops/register` that
 * actually creates the account — step 1 never calls the API, it only
 * collects fields and hands them here via router state. A visit with no
 * state (refresh, direct link, back button after submit) bounces to
 * `/signup`: there is nothing to submit without the fields from step 1.
 */
export function SignupDocumentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const setSession = useAuthStore((state) => state.setSession);
  const details = location.state as SignupDetails | null;

  const registerShop = useRegisterShop();
  const [files, setFiles] = useState<Partial<Record<DocumentField['key'], File>>>({});

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (!details) return <Navigate to="/signup" replace />;

  const canSubmit = Boolean(files.ownerNid);

  const handleSubmit = () => {
    if (!files.ownerNid) return;

    const payload: RegisterShopPayload = {
      owner_name: details.ownerName,
      phone: details.phone,
      password: details.password,
      confirm_password: details.confirmPassword,
      shop_name: details.shopName,
      ownerNid: files.ownerNid,
      tradeLicense: files.tradeLicense,
      tinCertificate: files.tinCertificate,
      otherDocument: files.otherDocument,
    };
    registerShop.mutate(payload, {
      onSuccess: (response) => {
        const data = response.data;
        if (!data) return;
        setSession(data.user.name, data.tokens);
        void navigate('/dashboard', { replace: true });
      },
    });
  };

  return (
    <AuthShell title="Verify your business" subtitle="The owner NID is required to continue">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-edge-strong bg-inset px-3.5 py-3">
          <span
            className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-slate-400">
            Your shop will stay <span className="font-medium text-slate-200">pending review</span>{' '}
            until a superuser approves it. Trade license, TIN certificate, and other documents are
            optional and can be added later from settings.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {DOCUMENT_FIELDS.map(({ key, label, required }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-edge-strong bg-inset px-3.5 py-3"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-medium text-slate-300">
                  {label}
                  {required && <span className="ml-1 text-rose-400">*</span>}
                </span>
                <label className="w-fit cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                  <span className="truncate">
                    {files[key]?.name ?? 'Choose a file (PDF, JPG, PNG)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(event) =>
                      setFiles((prev) => ({ ...prev, [key]: event.target.files?.[0] }))
                    }
                    className="hidden"
                  />
                </label>
              </div>
              {files[key] && (
                <button
                  type="button"
                  onClick={() => setFiles((prev) => ({ ...prev, [key]: undefined }))}
                  className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-300"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          size="lg"
          fullWidth
          disabled={!canSubmit}
          isLoading={registerShop.isPending}
          loadingText="Creating your shop…"
          onClick={handleSubmit}
          className="mt-1 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
        >
          Create shop
        </Button>
        {!canSubmit && (
          <p className="text-center text-xs text-slate-500">
            Attach the owner NID above to continue.
          </p>
        )}

        <button
          type="button"
          onClick={() => void navigate('/signup')}
          className="text-center text-xs font-medium text-slate-500 hover:text-slate-300"
        >
          Back to account details
        </button>
      </div>
    </AuthShell>
  );
}
