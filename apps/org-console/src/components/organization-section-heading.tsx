import { ORGANIZATION_SECTIONS } from '@/lib/constants/organization-sections.constants';

/**
 * A section page's title and description, read from the same list the
 * dashboard cards use — so a section is never described two different ways.
 */
export function OrganizationSectionHeading({
  section,
}: {
  section: (typeof ORGANIZATION_SECTIONS)[number]['id'];
}) {
  const { label, description } = ORGANIZATION_SECTIONS.find(
    ({ id }) => id === section,
  )!;

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-xl font-semibold text-foreground">{label}</h2>
      <p className="text-sm text-foreground/70">{description}</p>
    </div>
  );
}
