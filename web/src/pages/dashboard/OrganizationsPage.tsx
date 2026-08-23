import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';

export function OrganizationsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Organizations" description="The tenants you administer." />
      <EmptySection
        title="Not built yet"
        description="The organizations module has models and a database schema, but no API surface yet. This screen is a placeholder so the navigation reflects the real shape of the product."
      />
    </div>
  );
}
