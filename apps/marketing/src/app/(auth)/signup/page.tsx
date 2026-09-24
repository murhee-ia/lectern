import { SignUpForm } from '@/components/auth/signup-form';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ join_code?: string }>;
}) {
  const { join_code } = await searchParams;
  return <SignUpForm initialJoinCode={join_code} />;
}
