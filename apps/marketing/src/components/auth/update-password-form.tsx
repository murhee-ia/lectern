"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useForm } from "@tanstack/react-form";

import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { VoiceWaveform } from "@repo/ui/components/brand/voice-waveform";
import { updatePasswordSchema } from "@repo/lib/schemas/auth";
import { createBrowserSupabaseClient } from "@repo/supabase/browser";

export function UpdatePasswordForm() {
  
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const form = useForm({
    defaultValues: { password: "" },
    validators: {
      onChange: updatePasswordSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const data = updatePasswordSchema.parse(value);
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: data.password });

      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
    },
  });

  if (done) {
    return (
      <div className="text-center">
        <h1 className="heading-3">Password updated</h1>
        <Button asChild className="mt-4">
          <a href={process.env.NEXT_PUBLIC_WORKSPACE_URL}>Continue to Lectern</a>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="heading-3 text-center">Set a new password</h1>
      <div className="mt-4 flex justify-center">
        <VoiceWaveform />
      </div>
      <p className="mt-4 text-center text-sm text-foreground/70">
        Choose a strong new password to finish.
      </p>

      <form
        onSubmit={(formEvent) => {
          formEvent.preventDefault();
          formEvent.stopPropagation();
          form.handleSubmit();
        }}
        className="mt-6 flex flex-col gap-4"
      >
        <form.Field name="password">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>New password</Label>
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Updating…" : "Update password"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
