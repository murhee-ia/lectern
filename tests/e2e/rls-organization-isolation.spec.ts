import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("a freshly signed-up user only ever sees their own org-of-one's data", async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const email = `rls-${Date.now()}@example.com`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: "correcthorsebattery",
    email_confirm: true,
  });
  if (createError) throw createError;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw linkError;

  const asUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { error: verifyError } = await asUser.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyError) throw verifyError;

  const { error: rpcError } = await asUser.rpc("ensure_personal_organization");
  if (rpcError) throw rpcError;

  const { data: ownOrgs } = await asUser.from("organizations").select("id");
  expect(ownOrgs).toHaveLength(1);

  const { data: allOrgsAsAdmin } = await admin.from("organizations").select("id");
  expect((allOrgsAsAdmin?.length ?? 0)).toBeGreaterThan(ownOrgs!.length);

  // Deleting the user only cascades the membership row (organizations.created_by
  // is ON DELETE SET NULL, not CASCADE) — clean up the org itself too, or every
  // run leaves an orphaned row behind.
  await admin.from("organizations").delete().eq("id", ownOrgs![0]!.id);
  await admin.auth.admin.deleteUser(created!.user!.id);
});
