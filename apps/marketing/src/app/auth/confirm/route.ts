import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@repo/supabase/server";
import { resolveOrganizationMembershipAction } from "@/lib/actions/auth/auth.actions";
import { resolveSafeRedirect } from "@repo/lib/utils/auth";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const redirectTo = url.searchParams.get("redirect_to");

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/signin?error=invalid_confirmation_link", request.url));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(new URL("/signin?error=confirmation_failed", request.url));
  }

  if (type === "recovery") {
    // redirectTo comes straight from the request's own query string, not
    // from anything Supabase re-validates at this point — without checking
    // it against a known-safe origin, this would be an open redirect.
    const safeRedirectTo = resolveSafeRedirect(
      redirectTo,
      new URL("/reset-password/update", request.url).toString(),
    );
    return NextResponse.redirect(safeRedirectTo);
  }

  let joinCode: string | null = null;
  if (redirectTo) {
    try {
      joinCode = new URL(redirectTo).searchParams.get("join_code");
    } catch {
      // redirect_to wasn't a full URL — nothing to recover, proceed without a code
    }
  }

  const { joinedOrganizationId, joinCodeWasInvalid } = await resolveOrganizationMembershipAction(joinCode);

  const workspaceUrl = new URL(process.env.NEXT_PUBLIC_WORKSPACE_URL!);
  if (joinCodeWasInvalid) workspaceUrl.searchParams.set("notice", "invalid_join_code");
  else if (joinedOrganizationId) workspaceUrl.searchParams.set("notice", "joined_organization");
  return NextResponse.redirect(workspaceUrl);
}
