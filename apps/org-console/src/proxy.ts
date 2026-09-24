import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@repo/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (!user) {
    const signinUrl = new URL('/signin', process.env.NEXT_PUBLIC_MARKETING_URL);
    signinUrl.searchParams.set('next', request.nextUrl.href);
    return NextResponse.redirect(signinUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
