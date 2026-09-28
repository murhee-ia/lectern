import { OrganizationSectionHeading } from '@/components/organization-section-heading';
import { ComingLaterPanel } from '@/components/coming-later-panel';

export default function OrganizationPlanPage() {
  return (
    <section className="flex flex-col gap-5">
      <OrganizationSectionHeading section="plan" />
      <ComingLaterPanel title="Not designed yet">
        Plan details, limits, and this cycle&apos;s usage arrive with billing.
      </ComingLaterPanel>
    </section>
  );
}
