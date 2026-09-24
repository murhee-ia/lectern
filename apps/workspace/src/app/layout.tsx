import type { Metadata } from 'next';
import { figtree, fredoka, nunito } from '@repo/ui/fonts';
import { getWorkspaceOrganizationsAction } from '@repo/server/organization';
import { OrganizationSwitcher } from '@/components/organization/organization-switcher';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lectern',
  description:
    'A team-aware AI explainer. Upload a file or describe a topic, and Lectern discusses it aloud.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const { organizations, selectedOrganizationId } =
    await getWorkspaceOrganizationsAction();

  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <header className="flex items-center justify-between gap-4 p-4">
          <OrganizationSwitcher
            organizations={organizations}
            serverSelectedOrganizationId={selectedOrganizationId}
          />
          <a
            href="/account"
            className="text-sm text-foreground/70 hover:text-foreground"
          >
            Account
          </a>
        </header>
        {children}
      </body>
    </html>
  );
}
