import { SignUpForm } from '@/components/auth/signup-form';
import { authErrorMessage } from '@/lib/utils/auth-error-message';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{
    join_code?: string;
    next?: string;
    email?: string;
    invitation?: string;
    error?: string;
  }>;
}) {
  const { join_code, next, email, invitation, error } = await searchParams;
  return (
    <SignUpForm
      initialJoinCode={join_code}
      next={next}
      invitedEmail={email}
      invitationToken={invitation}
      initialError={authErrorMessage(error, email)}
    />
  );
}
