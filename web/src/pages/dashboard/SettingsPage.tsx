import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Settings" description="Your account and organization preferences." />
      <EmptySection
        title="Not built yet"
        description="The settings module has models and a database schema, but no API surface yet. This screen is a placeholder so the navigation reflects the real shape of the product."
      />
    </div>
  );
}
