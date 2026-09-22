"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { useForm } from "@tanstack/react-form";

import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { VoiceWaveform } from "@repo/ui/components/brand/voice-waveform";
import { resetPasswordRequestSchema } from "@repo/types/schemas/auth";
import { createBrowserSupabaseClient } from "@repo/supabase/browser";

import { TurnstileWidget } from "@/components/auth/turnstile-widget";

export function ResetPasswordRequestForm() {

  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const form = useForm({
    defaultValues: { email: "" },
    validators: {
      onChange: resetPasswordRequestSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      if (!turnstileToken) {
        setError("Please complete the verification challenge.");
        return;
      }

      const data = resetPasswordRequestSchema.parse(value);
      const redirectTo = new URL("/reset-password/update", window.location.origin);

      const supabase = createBrowserSupabaseClient();
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          data.email, 
          {
            redirectTo: redirectTo.toString(),
            captchaToken: turnstileToken,
          }
        );

        if (resetError) {
          console.error("resetPasswordForEmail returned an error:", resetError);
          setError(resetError.message);
          return;
        }
        
        setSubmittedEmail(data.email);
        setSent(true);
      } catch (thrownError) {
        console.error("resetPasswordForEmail threw:", thrownError);
        setError(thrownError instanceof Error ? thrownError.message : "Unknown error");
      }
    },
  });

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="heading-3">Check your email</h1>
        <p className="section-description mt-2">
          If an account exists for {submittedEmail}, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="heading-3 text-center">Reset your password</h1>
      <div className="mt-4 flex justify-center">
        <VoiceWaveform />
      </div>
      <p className="mt-4 text-center text-sm text-foreground/70">
        Remembered it?{" "}
        <Button variant="link" className="h-auto p-0" onClick={() => router.push("/signin")}>
          Sign in
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
        <TurnstileWidget onToken={setTurnstileToken} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" className="w-full" disabled={isSubmitting || !turnstileToken}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
