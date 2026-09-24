import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@repo/supabase/middleware';

const AUTH_FORM_PATHS = ['/signin', '/signup', '/otp'];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (
    user &&
    request.method === 'GET' &&
    AUTH_FORM_PATHS.includes(request.nextUrl.pathname)
  ) {
    return NextResponse.redirect(process.env.NEXT_PUBLIC_WORKSPACE_URL!);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/).*)'],
};
