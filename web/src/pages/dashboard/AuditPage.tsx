import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';

export function AuditPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Audit log" description="An append-only record of who changed what." />
      <EmptySection
        title="Not built yet"
        description="The audit module has models and a database schema, but no API surface yet. This screen is a placeholder so the navigation reflects the real shape of the product."
      />
    </div>
  );
}
