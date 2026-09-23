import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const cookieOptions =
    process.env.NODE_ENV === "production" ? { domain: ".lecternapp.me" } : undefined;

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => 
                cookieStore.set(name, value, options),
            )
          } catch {
            // setAll is called from a Server Component during render,
            // where cookies can't be mutated.
          }
        }
      }
    }
  );
}