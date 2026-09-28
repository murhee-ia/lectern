import Link from 'next/link';

/** Shown instead of the sign-in step when an invitation link can't be used. */
export function InvitationNotice({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="text-center">
      <h1 className="heading-3">{title}</h1>
      <p className="section-description mt-2">{message}</p>
      <Link
        href="/signin"
        className="mt-6 inline-block text-sm text-foreground/70 underline-offset-4 hover:text-foreground hover:underline"
      >
        Go to sign in
      </Link>
    </div>
  );
}
