import { SignInOtpForm } from '@/components/auth/signin-otp-form';

export default async function OtpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; invitation?: string }>;
}) {
  const { next, email, invitation } = await searchParams;
  return (
    <SignInOtpForm
      next={next}
      invitedEmail={email}
      invitationToken={invitation}
    />
  );
}
