import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';

export function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Products" description="Inventory for the organizations you belong to." />
      <EmptySection
        title="Not built yet"
        description="The products module has models and a database schema, but no API surface yet. This screen is a placeholder so the navigation reflects the real shape of the product."
      />
    </div>
  );
}
