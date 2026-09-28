import { ComingLaterPanel } from '@/components/coming-later-panel';

export default async function TeamSessionDetailsPage({
  params,
}: PageProps<'/organizations/[organizationId]/sessions/[sessionId]'>) {
  const { sessionId } = await params;

  return (
    <ComingLaterPanel title="Session details">
      This page isn&apos;t designed yet. It will show session{' '}
      <code className="font-mono text-xs break-all text-foreground/80">
        {sessionId}
      </code>{' '}
      once team sessions exist.
    </ComingLaterPanel>
  );
}
