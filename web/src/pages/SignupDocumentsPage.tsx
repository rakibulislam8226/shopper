import { type RegisterShopPayload, type ShopDocumentType, useRegisterShop } from '@api/shops';
import { type SignupDetails } from '@components/auth/SignUpForm';
import { SplitAuthCard } from '@components/auth/SplitAuthCard';
import { Button } from '@components/ui/Button';
import { ArrowLeftIcon, CheckIcon, FileIcon, ShieldIcon } from '@components/ui/icons';
import { useAuthStore, useIsAuthenticated } from '@stores/auth';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

interface DocumentField {
  key: 'ownerNid' | 'tradeLicense' | 'tinCertificate' | 'otherDocument';
  type: ShopDocumentType;
  label: string;
  description: string;
  required?: boolean;
}

const DOCUMENT_FIELDS: DocumentField[] = [
  {
    key: 'ownerNid',
    type: 'owner_nid',
    label: 'Owner NID',
    description: 'A government-issued ID confirming who owns this shop.',
    required: true,
  },
  {
    key: 'tradeLicense',
    type: 'trade_license',
    label: 'Trade License',
    description: 'Proof your business is registered to trade.',
  },
  {
    key: 'tinCertificate',
    type: 'tin_certificate',
    label: 'TIN Certificate',
    description: 'Your tax identification, for financial verification.',
  },
  {
    key: 'otherDocument',
    type: 'other',
    label: 'Other document',
    description: 'Anything else that supports your application.',
  },
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
  const [shopLogo, setShopLogo] = useState<File | undefined>(undefined);

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
      shopLogo,
      ownerNid: files.ownerNid,
      tradeLicense: files.tradeLicense,
      tinCertificate: files.tinCertificate,
      otherDocument: files.otherDocument,
    };
    registerShop.mutate(payload, {
      onSuccess: (response) => {
        const data = response.data;
        if (!data) return;
        setSession(data.user.name, data.tokens, data.shop.uid);
        void navigate('/dashboard', { replace: true });
      },
    });
  };

  return (
    <SplitAuthCard
      panelTitle="Verify your business"
      panelBody="A quick document check keeps every shop on the platform legitimate — most approvals clear within one business day."
      panelIcon={<ShieldIcon className="h-6 w-6" />}
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          Submit your documents
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          The owner NID is required; the rest can wait until later if you're in a hurry.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <DocumentRow
          label="Shop logo"
          description="A square image to represent your shop across the app."
          file={shopLogo}
          onSelect={setShopLogo}
          accept=".jpg,.jpeg,.png,.webp"
        />
        {DOCUMENT_FIELDS.map(({ key, label, description, required }) => (
          <DocumentRow
            key={key}
            label={label}
            description={description}
            required={required}
            file={files[key]}
            onSelect={(file) => setFiles((prev) => ({ ...prev, [key]: file }))}
          />
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
        className="mt-5 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
      >
        Create shop
      </Button>
      {!canSubmit && (
        <p className="mt-2 text-center text-xs text-text-muted">
          Attach the owner NID above to continue.
        </p>
      )}

      <button
        type="button"
        onClick={() => void navigate('/signup', { state: details })}
        className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Back to account details
      </button>
    </SplitAuthCard>
  );
}

function DocumentRow({
  label,
  description,
  required,
  file,
  onSelect,
  accept = '.pdf,.jpg,.jpeg,.png,.webp',
}: {
  label: string;
  description: string;
  required?: boolean;
  file: File | undefined;
  onSelect: (file: File | undefined) => void;
  accept?: string;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
        file
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-edge-strong bg-inset hover:border-brand-ring'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
          file
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-elevated text-text-muted group-hover:text-text-secondary'
        }`}
      >
        {file ? <CheckIcon className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-secondary">{label}</span>
          {required && (
            <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-rose-400 uppercase">
              Required
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-text-muted">
          {file ? file.name : description}
        </span>
      </span>

      {file ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onSelect(undefined);
          }}
          className="shrink-0 text-xs font-medium text-text-muted hover:text-rose-400"
        >
          Remove
        </button>
      ) : (
        <span className="shrink-0 text-xs font-medium text-indigo-400 group-hover:text-indigo-300">
          Choose file
        </span>
      )}

      <input
        type="file"
        accept={accept}
        onChange={(event) => onSelect(event.target.files?.[0])}
        className="hidden"
      />
    </label>
  );
}
