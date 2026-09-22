"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Building2, User } from "lucide-react";
import { useForm, useSelector } from "@tanstack/react-form";

import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { VoiceWaveform } from "@repo/ui/components/brand/voice-waveform";
import { signUpSchema } from "@repo/lib/schemas/auth";
import { createBrowserSupabaseClient } from "@repo/supabase/browser";

import { isDisposableEmailDomain } from "@/lib/utils/auth/disposable-email";

import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function SignUpForm({ initialJoinCode }: { initialJoinCode?: string }) {
  
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      displayName: "",
      email: "",
      password: "",
      joinCode: initialJoinCode ?? "",
    },
    validators: {
      onChange: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      if (isDisposableEmailDomain(value.email)) {
        setError("Please use a permanent email address, not a disposable one.");
        return;
      }

      if (!turnstileToken) {
        setError("Please complete the verification challenge.");
        return;
      }

      const data = signUpSchema.parse(value);
      
      const emailRedirectTo = new URL("/", window.location.origin);
      if (data.joinCode) emailRedirectTo.searchParams.set("join_code", data.joinCode);

      const supabase = createBrowserSupabaseClient();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          captchaToken: turnstileToken,
          emailRedirectTo: emailRedirectTo.toString(),
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            display_name: data.displayName || "",
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (signUpData.user?.identities?.length === 0) {
        setError("An account with this email already exists. Sign in instead.");
        return;
      }

      setSubmittedEmail(data.email);
      setSubmitted(true);
    },
  });

  const joinCode = useSelector(form.store, (state) => state.values.joinCode);

  if (submitted) {
    return (
      <div className="text-center">
        <h1 className="heading-3">Check your email</h1>
        <p className="section-description mt-2">
          We sent a confirmation link to <strong>{submittedEmail}</strong>. Click it to activate
          your account.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="heading-3 text-center">Create your account</h1>
      <div className="mt-4 flex justify-center">
        <VoiceWaveform />
      </div>
      <p className="mt-4 text-center text-sm text-foreground/70">
        Already have an account?{" "}
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
        <div className="grid grid-cols-2 gap-4">
          <form.Field name="firstName">
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>First name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Jane"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(changeEvent) => field.handleChange(changeEvent.target.value)}
                  aria-invalid={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors.map((fieldError) => fieldError?.message ?? fieldError).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>
          <form.Field name="lastName">
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Last name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Doe"
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
        </div>
        <form.Field name="displayName">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Display name (optional)</Label>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                icon={<User />}
                maxLength={80}
                placeholder="Defaults to first and last name"
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
                placeholder="At least 6 characters"
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
        <form.Field name="joinCode">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Organization code (optional)</Label>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                icon={<Building2 />}
                placeholder="Have a code? Enter it here"
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
              {isSubmitting ? "Creating account…" : "Sign up"}
            </Button>
          )}
        </form.Subscribe>
      </form>
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-lectern-white/10" />
        <span className="text-xs font-medium tracking-wide text-foreground/50 uppercase">or</span>
        <div className="h-px flex-1 bg-lectern-white/10" />
      </div>
      <GoogleSignInButton joinCode={joinCode || undefined} />
    </div>
  );
}
