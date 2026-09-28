import { CreditCard, Mail, Presentation, Settings, Users } from 'lucide-react';

/**
 * The sections of one organization's console, in the order the dashboard
 * lists them. Each `id` is also the section's URL segment, so the dashboard
 * links and the breadcrumb both read from this one list.
 */
export const ORGANIZATION_SECTIONS = [
  {
    id: 'members',
    label: 'Members',
    description:
      'Everyone in the organization, their roles, and the team sessions they took part in.',
    icon: Users,
  },
  {
    id: 'invitations',
    label: 'Invitations',
    description: 'Share the organization code, or invite people by email.',
    icon: Mail,
  },
  {
    id: 'sessions',
    label: 'Team sessions',
    description: 'Every team session run in this organization.',
    icon: Presentation,
  },
  {
    id: 'plan',
    label: 'Plan',
    description: "Your plan, its limits, and this cycle's usage.",
    icon: CreditCard,
  },
  {
    id: 'settings',
    label: 'Settings',
    description:
      'Rename the organization, manage its code, and hand off the admin role.',
    icon: Settings,
  },
] as const;
