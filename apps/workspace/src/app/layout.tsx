import type { Metadata } from 'next';
import Link from 'next/link';
import { figtree, fredoka, nunito } from '@repo/ui/fonts';
import {
  getOrganizationAccess,
  getOrganizationSelection,
} from '@repo/server/organization/queries';
import { OrganizationAccessProvider } from '@repo/lib/hooks/organization';
import { OrganizationSwitcher } from '@/components/organization/organization-switcher';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lectern',
  description:
    'A team-aware AI explainer. Upload a file or describe a topic, and Lectern discusses it aloud.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const { organizations, selectedOrganization } = await getOrganizationSelection();
  const access = ( await getOrganizationAccess(selectedOrganization.id) ) ?? {
    organization: { 
        id: selectedOrganization.id, 
        name: selectedOrganization.name, 
        plan: selectedOrganization.plan 
      },
    role: selectedOrganization.role,
    permissions: [],
  };

  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <OrganizationAccessProvider access={access}>
          <header className="flex items-center justify-between gap-3 p-4">
            <OrganizationSwitcher
              organizations={organizations}
              serverSelectedOrganizationId={selectedOrganization.id}
            />
            <nav className="flex shrink-0 items-center gap-4 text-sm">
              <Link
                href="/members"
                className="text-foreground/70 hover:text-foreground"
              >
                Members
              </Link>
              <Link
                href="/account"
                className="text-foreground/70 hover:text-foreground"
              >
                Account
              </Link>
            </nav>
          </header>
          {children}
        </OrganizationAccessProvider>
      </body>
    </html>
  );
}
