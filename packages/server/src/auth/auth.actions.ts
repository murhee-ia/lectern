'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@repo/supabase/server';

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect(`${process.env.NEXT_PUBLIC_MARKETING_URL}/signin`);
}
