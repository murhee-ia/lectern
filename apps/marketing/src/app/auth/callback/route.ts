import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@repo/supabase/server";
import { resolveOrganizationMembershipAction } from "@/lib/actions/auth/auth.actions";
import { resolveSafeRedirect } from "@repo/lib/utils/auth";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const joinCode = url.searchParams.get("join_code");
  const next = url.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/signin?error=oauth_failed", request.url));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/signin?error=oauth_failed", request.url));
  }

  const { joinedOrganizationId, joinCodeWasInvalid } = await resolveOrganizationMembershipAction(joinCode);

  const destination = new URL(resolveSafeRedirect(next, process.env.NEXT_PUBLIC_WORKSPACE_URL!));
  if (joinCodeWasInvalid) destination.searchParams.set("notice", "invalid_join_code");
  else if (joinedOrganizationId) destination.searchParams.set("notice", "joined_organization");
  return NextResponse.redirect(destination);
}
