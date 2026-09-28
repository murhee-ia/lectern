import { SignInForm } from '@/components/auth/signin-form';
import { authErrorMessage } from '@/lib/utils/auth-error-message';

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    email?: string;
    invitation?: string;
    error?: string;
  }>;
}) {
  const { next, email, invitation, error } = await searchParams;
  return (
    <SignInForm
      next={next}
      invitedEmail={email}
      invitationToken={invitation}
      initialError={authErrorMessage(error, email)}
    />
  );
}
