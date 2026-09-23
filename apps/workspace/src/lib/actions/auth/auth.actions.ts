"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@repo/supabase/server";
import { createServiceRoleSupabaseClient } from "@repo/supabase/admin";
import { updateProfileSchema } from "@repo/lib/schemas/profile";

export async function updateProfileAction(
  displayName: string,
  firstName: string,
  lastName: string,
): Promise<{ error?: string }> {
  const parsed = updateProfileSchema.safeParse({ displayName, firstName, lastName });
  if (!parsed.success) {
    return { error: "Each name field can be at most 80 characters." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("member_profiles")
    .update({
      display_name: parsed.data.displayName || null,
      first_name: parsed.data.firstName || null,
      last_name: parsed.data.lastName || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function setAvatarAction(): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." };
  }

  const { error } = await supabase
    .from("member_profiles")
    .update({ avatar_path: `${user.id}/avatar` })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function deleteAccountAction(): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { data: canDelete, error: guardError } = await supabase.rpc("can_delete_own_account");

  if (guardError) {
    return { error: guardError.message };
  }
  if (!canDelete) {
    return {
      error: "You're the sole Admin of an organization with other members. Hand off the Admin role before deleting your account.",
    };
  }

  const admin = createServiceRoleSupabaseClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  redirect(`${process.env.NEXT_PUBLIC_MARKETING_URL}/signin`);
}
