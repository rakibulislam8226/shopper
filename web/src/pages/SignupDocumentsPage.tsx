import { type ShopDocumentType, useUploadShopDocument } from '@api/shops';
import { AuthShell } from '@components/auth/AuthShell';
import { Button } from '@components/ui/Button';
import { useAuthStore, useIsAuthenticated } from '@stores/auth';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

const DOCUMENT_TYPES: { value: ShopDocumentType; label: string }[] = [
  { value: 'owner_nid', label: 'Owner NID' },
  { value: 'trade_license', label: 'Trade License' },
  { value: 'tin_certificate', label: 'TIN Certificate' },
];

interface LocationState {
  shopUid?: string;
}

/**
 * Post-registration step: optionally attach approval documents before
 * landing in the dashboard. `shopUid` arrives via router state from
 * `SignUpForm` — a direct visit (refresh, bookmark) with no state just skips
 * ahead, since there is nothing to upload against.
 */
export function SignupDocumentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const name = useAuthStore((state) => state.name);
  const shopUid = (location.state as LocationState | null)?.shopUid;

  const uploadDocument = useUploadShopDocument();
  const [files, setFiles] = useState<Partial<Record<ShopDocumentType, File>>>({});
  const [uploadedTypes, setUploadedTypes] = useState<Set<ShopDocumentType>>(new Set());

  if (!isAuthenticated || !name) return <Navigate to="/signup" replace />;
  if (!shopUid) return <Navigate to="/dashboard" replace />;

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
    <AuthShell title="Verify your business" subtitle="A few documents speed up admin review">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-edge-strong bg-inset px-3.5 py-3">
          <span
            className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-slate-400">
            Your shop is <span className="font-medium text-slate-200">pending review</span>.
            Submit these documents now to speed up approval — you can also add them later from
            settings.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {DOCUMENT_TYPES.map(({ value, label }) => {
            const isUploaded = uploadedTypes.has(value);
            return (
              <div
                key={value}
                className="flex items-center justify-between gap-3 rounded-lg border border-edge-strong bg-inset px-3.5 py-3"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-xs font-medium text-slate-300">{label}</span>
                  <label className="w-fit cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                    <span className="truncate">
                      {files[value]?.name ?? 'Choose a file (PDF, JPG, PNG)'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      disabled={isUploaded}
                      onChange={(event) =>
                        setFiles((prev) => ({ ...prev, [value]: event.target.files?.[0] }))
                      }
                      className="hidden"
                    />
                  </label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isUploaded ? 'secondary' : 'primary'}
                  disabled={isUploaded || !files[value]}
                  isLoading={uploadDocument.isPending}
                  onClick={() => handleUpload(value)}
                  className="shrink-0"
                >
                  {isUploaded ? (
                    <>
                      <CheckIcon /> Uploaded
                    </>
                  ) : (
                    'Upload'
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <Button type="button" size="lg" fullWidth onClick={finish} className="mt-1">
          {uploadedTypes.size > 0 ? 'Continue to dashboard' : 'Skip for now'}
        </Button>
      </div>
    </AuthShell>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
