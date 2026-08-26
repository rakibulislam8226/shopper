import { type ShopDocumentType, useShopDetail, useUploadShopDocument } from '@api/shops';
import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';
import { Button } from '@components/ui/Button';
import { CheckIcon, FileIcon } from '@components/ui/icons';
import { useAuthStore } from '@stores/auth';
import { useRef, useState } from 'react';

const DOCUMENT_LABELS: Record<ShopDocumentType, string> = {
  owner_nid: 'Owner NID',
  trade_license: 'Trade License',
  tin_certificate: 'TIN Certificate',
  other: 'Other document',
};

const UPLOADABLE_TYPES: ShopDocumentType[] = [
  'owner_nid',
  'trade_license',
  'tin_certificate',
  'other',
];

export function ShopDocumentsPage() {
  const activeShopUid = useAuthStore((state) => state.activeShopUid);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Documents"
        description="Owner NID and supporting documents for shop approval."
      />
      {activeShopUid ? (
        <DocumentsSection shopUid={activeShopUid} />
      ) : (
        <EmptySection
          title="No active shop"
          description="Select a shop from the switcher to manage its documents."
        />
      )}
    </div>
  );
}

function DocumentsSection({ shopUid }: { shopUid: string }) {
  const { data, isLoading, isError } = useShopDetail(shopUid);
  const uploadDocument = useUploadShopDocument();
  const [pendingUpload, setPendingUpload] = useState<ShopDocumentType | null>(null);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading documents…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-rose-400">Unable to load this shop's documents.</p>;
  }

  const handleUpload = (type: ShopDocumentType, file: File) => {
    setPendingUpload(type);
    uploadDocument.mutate({ shopUid, type, file }, { onSettled: () => setPendingUpload(null) });
  };

  return (
    <div className="flex flex-col gap-3">
      {UPLOADABLE_TYPES.map((type) => (
        <DocumentRow
          key={type}
          label={DOCUMENT_LABELS[type]}
          existingFileUrl={data.documents.find((document) => document.type === type)?.file_url}
          isUploading={uploadDocument.isPending && pendingUpload === type}
          onUpload={(file) => handleUpload(type, file)}
        />
      ))}

      {data.documents.length === 0 && (
        <p className="text-xs text-slate-500">
          No documents submitted yet. The owner NID is required for approval.
        </p>
      )}
    </div>
  );
}

function DocumentRow({
  label,
  existingFileUrl,
  isUploading,
  onUpload,
}: {
  label: string;
  existingFileUrl: string | undefined;
  isUploading: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-edge-strong bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={
            existingFileUrl
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400'
              : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-slate-500'
          }
        >
          {existingFileUrl ? <CheckIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200">{label}</p>
          {existingFileUrl ? (
            <a
              href={existingFileUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate text-xs text-indigo-400 hover:text-indigo-300"
            >
              View uploaded file
            </a>
          ) : (
            <p className="text-xs text-slate-500">Not submitted yet</p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = '';
        }}
      />
      <Button
        type="button"
        variant={existingFileUrl ? 'secondary' : 'primary'}
        size="sm"
        isLoading={isUploading}
        loadingText="Uploading…"
        onClick={() => inputRef.current?.click()}
        className="shrink-0"
      >
        {existingFileUrl ? 'Replace' : 'Upload'}
      </Button>
    </div>
  );
}
