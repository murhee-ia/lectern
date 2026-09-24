import { Button } from '@repo/ui/components/ui/button';

export function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Button type="submit" variant="ghost">
        Sign out
      </Button>
    </form>
  );
}
