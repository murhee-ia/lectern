"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { useForm } from "@tanstack/react-form";

import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { VoiceWaveform } from "@repo/ui/components/brand/voice-waveform";
import { signInSchema } from "@repo/lib/schemas/auth";
import { resolveSafeRedirect } from "@repo/lib/utils/auth";
import { createBrowserSupabaseClient } from "@repo/supabase/browser";

import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function SignInForm({ next }: { next?: string }) {

  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChange: signInSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setUnconfirmed(false);

      if (!turnstileToken) {
        setError("Please complete the verification challenge.");
        return;
      }

      const data = signInSchema.parse(value);
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        ...data,
        options: { captchaToken: turnstileToken },
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("confirm")) {
          setUnconfirmed(true);
        } else {
          setError(signInError.message);
        }
        return;
      }

      window.location.href = resolveSafeRedirect(next, process.env.NEXT_PUBLIC_WORKSPACE_URL!);
    },
  });

  const handleResendConfirmation = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.resend({ type: "signup", email: form.state.values.email });
    setError("Confirmation email resent. Check your inbox.");
    setUnconfirmed(false);
  };

  return (
    <div>
      <h1 className="heading-3 text-center">Sign in to your account</h1>
      <div className="mt-4 flex justify-center">
        <VoiceWaveform />
      </div>
      <p className="mt-4 text-center text-sm text-foreground/70">
        New here?{" "}
        <Button variant="link" className="h-auto p-0" onClick={() => router.push("/signup")}>
          Create an account
        </Button>
      </p>

      <form
        onSubmit={(formEvent) => {
          formEvent.preventDefault();
          formEvent.stopPropagation();
          form.handleSubmit();
        }}
        className="mt-6 flex flex-col gap-4"
      >
        <form.Field name="email">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Email</Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                icon={<Mail />}
                required
                placeholder="you@example.com"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(changeEvent) => field.handleChange(changeEvent.target.value)}
                aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">{field.state.meta.errors.map((fieldError) => fieldError?.message ?? fieldError).join(", ")}</p>
              )}
            </div>
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Password</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                icon={<Lock />}
                required
                placeholder="Enter your password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(changeEvent) => field.handleChange(changeEvent.target.value)}
                aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">{field.state.meta.errors.map((fieldError) => fieldError?.message ?? fieldError).join(", ")}</p>
              )}
            </div>
          )}
        </form.Field>
        <TurnstileWidget onToken={setTurnstileToken} />
        {unconfirmed && (
          <p className="text-sm text-highlight">
            Your account isn&apos;t confirmed yet.{" "}
            <Button variant="link" className="h-auto p-0" onClick={handleResendConfirmation}>
              Resend confirmation email
            </Button>
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" className="w-full" disabled={isSubmitting || !turnstileToken}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          )}
        </form.Subscribe>
      </form>
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-lectern-white/10" />
        <span className="text-xs font-medium tracking-wide text-foreground/50 uppercase">or</span>
        <div className="h-px flex-1 bg-lectern-white/10" />
      </div>
      <GoogleSignInButton next={next} />
      <p className="mt-4 text-center text-sm">
        <Button 
          variant="link" 
          className="h-auto p-0"
          onClick={() => router.push("/otp")}
        >
          Sign in with an email code instead
        </Button>
      </p>
      <p className="mt-2 text-center text-sm">
        <Button
          variant="link"
          className="h-auto p-0"
          onClick={() => router.push("/reset-password")}
        >
          Forgot your password?
        </Button>
      </p>
    </div>
  );
}
