import { NextResponse, type NextRequest } from 'next/server';
import { resolveSafeRedirect } from '@repo/lib/utils/auth/safe-redirect';
import { updateSession } from '@repo/supabase/middleware';

const AUTH_FORM_PATHS = ['/signin', '/signup', '/otp'];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  // Already signed in: skip the form, but still go where it would have sent
  // them — an invitation's accept page, for one.
  if (
    user &&
    request.method === 'GET' &&
    AUTH_FORM_PATHS.includes(request.nextUrl.pathname)
  ) {
    return NextResponse.redirect(
      resolveSafeRedirect(
        request.nextUrl.searchParams.get('next'),
        process.env.NEXT_PUBLIC_WORKSPACE_URL!,
      ),
    );
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/).*)'],
};
