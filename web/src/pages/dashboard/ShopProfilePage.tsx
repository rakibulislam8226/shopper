import { useShopDetail, useUpdateShop } from '@api/shops';
import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';
import { Button } from '@components/ui/Button';
import { StatusPill, type StatusTone } from '@components/ui/StatusPill';
import { useAuthStore } from '@stores/auth';
import { type FormEvent, useState } from 'react';

const STATUS_COPY: Record<string, { label: string; tone: StatusTone }> = {
  active: { label: 'Active', tone: 'positive' },
  pending: { label: 'Pending review', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'negative' },
  rejected: { label: 'Rejected', tone: 'negative' },
  removed: { label: 'Removed', tone: 'negative' },
};

export function ShopProfilePage() {
  const activeShopUid = useAuthStore((state) => state.activeShopUid);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Shop profile" description="Name, contact details, and address." />
      {activeShopUid ? (
        <ShopProfileForm shopUid={activeShopUid} />
      ) : (
        <EmptySection
          title="No active shop"
          description="Select a shop from the switcher to manage its profile."
        />
      )}
    </div>
  );
}

function ShopProfileForm({ shopUid }: { shopUid: string }) {
  const { data, isLoading, isError } = useShopDetail(shopUid);
  const updateShop = useUpdateShop();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the form once, the first time data arrives — an uncontrolled
  // refetch (e.g. after saving) must not stomp on what the owner is typing.
  if (data && !hydrated) {
    setName(data.shop.name);
    setEmail(data.shop.email ?? '');
    setPhone(data.shop.phone ?? '');
    setAddress(data.shop.address ?? '');
    setHydrated(true);
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading shop profile…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-rose-400">Unable to load this shop's profile.</p>;
  }

  const status = STATUS_COPY[data.shop.status] ?? { label: data.shop.status, tone: 'neutral' };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateShop.mutate({
      shopUid,
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-edge-strong bg-card p-6"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Approval status</span>
        <StatusPill label={status.label} tone={status.tone} />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-400">Shop name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="rounded-lg border border-edge-strong bg-inset px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-400">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="shop@example.com"
          className="rounded-lg border border-edge-strong bg-inset px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-400">Phone</span>
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="01XXXXXXXXX"
          className="rounded-lg border border-edge-strong bg-inset px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-400">Address</span>
        <input
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="123 Market St"
          className="rounded-lg border border-edge-strong bg-inset px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring"
        />
      </label>

      <Button
        type="submit"
        size="md"
        isLoading={updateShop.isPending}
        loadingText="Saving…"
        className="self-start"
      >
        Save changes
      </Button>
    </form>
  );
}
