"use client";

import { createBrowserSupabaseClient } from "@repo/supabase/browser";
import { Button } from "@repo/ui/components/ui/button";

export function GoogleSignInButton({ joinCode, next }: { joinCode?: string; next?: string }) {

  const handleClick = async () => {
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (joinCode) redirectTo.searchParams.set("join_code", joinCode);
    if (next) redirectTo.searchParams.set("next", next);

    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });
  };

  return (
    <Button type="button" variant="secondary" className="w-full" onClick={handleClick}>
      <svg viewBox="0 0 18 18" className="size-4" aria-hidden>
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.27h2.92c1.71-1.58 2.69-3.9 2.69-6.64z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.27c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.95H.96a9 9 0 0 0 0 8.1z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
        />
      </svg>
      Continue with Google
    </Button>
  );
}
