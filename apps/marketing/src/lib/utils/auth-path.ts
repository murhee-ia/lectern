/**
 * An auth page's path, carrying where to go afterwards and, for someone
 * opening an invitation, the invited email and the invitation's token, so
 * moving between sign-in, sign-up, and the email code keeps all three.
 */
export function authPath(
  path: '/signin' | '/signup' | '/otp',
  {
    next,
    email,
    invitation,
  }: { next?: string; email?: string; invitation?: string },
): string {
  const params = new URLSearchParams();
  if (next) params.set('next', next);
  if (email) params.set('email', email);
  if (invitation) params.set('invitation', invitation);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
