import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';

export function StaffPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Staff"
        description="People with access to your organization, and their roles."
      />
      <EmptySection
        title="Not built yet"
        description="The memberships module has models and a database schema, but no API surface yet. This screen is a placeholder so the navigation reflects the real shape of the product."
      />
    </div>
  );
}
