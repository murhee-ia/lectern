import { SignInOtpForm } from '@/components/auth/signin-otp-form';

export default async function OtpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <SignInOtpForm next={next} />;
}
