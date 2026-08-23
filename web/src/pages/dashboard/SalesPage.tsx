import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';

export function SalesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Sales" description="Transactions recorded by your team." />
      <EmptySection
        title="Not built yet"
        description="The sales module has models and a database schema, but no API surface yet. This screen is a placeholder so the navigation reflects the real shape of the product."
      />
    </div>
  );
}
