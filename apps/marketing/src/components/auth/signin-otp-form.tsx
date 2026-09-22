"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, KeyRound } from "lucide-react";
import { useForm } from "@tanstack/react-form";

import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { VoiceWaveform } from "@repo/ui/components/brand/voice-waveform";
import { otpRequestSchema, otpVerifySchema } from "@repo/types/schemas/auth";
import { createBrowserSupabaseClient } from "@repo/supabase/browser";

import { resolveSafeRedirect } from "@/lib/utils/auth/safe-redirect";

import { TurnstileWidget } from "@/components/auth/turnstile-widget";

export function SignInOtpForm({ next }: { next?: string }) {
  
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestForm = useForm({
    defaultValues: { email: "" },
    validators: {
      onChange: otpRequestSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      if (!turnstileToken) {
        setError("Please complete the verification challenge.");
        return;
      }

      const data = otpRequestSchema.parse(value);
      const supabase = createBrowserSupabaseClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: data.email,
        // Email OTP is a returning-user sign-in method only — first-time
        // account creation always goes through password signup or Google,
        // never OTP. shouldCreateUser: false enforces that at the API level.
        options: { captchaToken: turnstileToken, shouldCreateUser: false },
      });

      if (otpError) {
        if (otpError.code === "otp_disabled") {
          setError(
            "No account found for that email. Sign up first, then you can use an email code to sign in."
          );
        } else {
          setError(otpError.message);
        }
        return;
      }

      setSubmittedEmail(data.email);
      setStep("verify");
    },
  });

  const verifyForm = useForm({
    defaultValues: { token: "" },
    onSubmit: async ({ value }) => {
      setError(null);

      const supabase = createBrowserSupabaseClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: submittedEmail,
        token: value.token,
        type: "email",
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      window.location.href = resolveSafeRedirect(next, process.env.NEXT_PUBLIC_WORKSPACE_URL!);
    },
  });

  if (step === "request") {
    return (
      <div>
        <h1 className="heading-3 text-center">Sign in with an email code</h1>
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
            requestForm.handleSubmit();
          }}
          className="mt-6 flex flex-col gap-4"
        >
          <requestForm.Field name="email">
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
          </requestForm.Field>
          <TurnstileWidget onToken={setTurnstileToken} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <requestForm.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" className="w-full" disabled={isSubmitting || !turnstileToken}>
                {isSubmitting ? "Sending…" : "Send code"}
              </Button>
            )}
          </requestForm.Subscribe>
        </form>
        <p className="mt-4 text-center text-sm">
          <Button variant="link" className="h-auto p-0" onClick={() => router.push("/signin")}>
            Sign in with a password instead
          </Button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="heading-3 text-center">Enter your code</h1>
      <div className="mt-4 flex justify-center">
        <VoiceWaveform />
      </div>
      <p className="mt-4 text-center text-sm text-foreground/70">
        We sent a 6-digit code to {submittedEmail}.
      </p>

      <form
        onSubmit={(formEvent) => {
          formEvent.preventDefault();
          formEvent.stopPropagation();
          verifyForm.handleSubmit();
        }}
        className="mt-6 flex flex-col gap-4"
      >
        <verifyForm.Field name="token" validators={{ onChange: otpVerifySchema.shape.token }}>
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Code</Label>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                icon={<KeyRound />}
                required
                maxLength={6}
                placeholder="123456"
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
        </verifyForm.Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <verifyForm.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying…" : "Verify and sign in"}
            </Button>
          )}
        </verifyForm.Subscribe>
      </form>
      <p className="mt-4 text-center text-sm">
        <Button variant="link" className="h-auto p-0" onClick={() => setStep("request")}>
          Use a different email
        </Button>
      </p>
      <p className="mt-2 text-center text-sm">
        <Button variant="link" className="h-auto p-0" onClick={() => router.push("/signin")}>
          Sign in with a password instead
        </Button>
      </p>
    </div>
  );
}
