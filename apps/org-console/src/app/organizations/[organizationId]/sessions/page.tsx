import { OrganizationSectionHeading } from '@/components/organization-section-heading';
import { ComingLaterPanel } from '@/components/coming-later-panel';

export default function OrganizationTeamSessionsPage() {
  return (
    <section className="flex flex-col gap-5">
      <OrganizationSectionHeading section="sessions" />
      <ComingLaterPanel title="Not designed yet">
        The team session list arrives with team sessions themselves — there
        isn&apos;t a sessions table to list from yet.
      </ComingLaterPanel>
    </section>
  );
}
