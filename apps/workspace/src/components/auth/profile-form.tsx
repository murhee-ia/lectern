'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { useForm } from '@tanstack/react-form';

import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { updateProfileSchema } from '@repo/lib/schemas/profile';

import { updateProfileAction } from '@/lib/actions/auth/auth.actions';

export function ProfileForm({
  initialDisplayName,
  initialFirstName,
  initialLastName,
}: {
  initialDisplayName: string | null;
  initialFirstName: string | null;
  initialLastName: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm({
    defaultValues: {
      displayName: initialDisplayName ?? '',
      firstName: initialFirstName ?? '',
      lastName: initialLastName ?? '',
    },
    validators: {
      onChange: updateProfileSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setSaved(false);

      const data = updateProfileSchema.parse(value);
      const result = await updateProfileAction(
        data.displayName,
        data.firstName,
        data.lastName,
      );

      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    },
  });

  return (
    <form
      onSubmit={(formEvent) => {
        formEvent.preventDefault();
        formEvent.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <form.Field name="displayName">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Display name</Label>
            <Input
              id={field.name}
              name={field.name}
              type="text"
              icon={<User />}
              maxLength={80}
              placeholder="e.g. Jane D."
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(changeEvent) => {
                field.handleChange(changeEvent.target.value);
                setSaved(false);
              }}
              aria-invalid={
                field.state.meta.isTouched && field.state.meta.errors.length > 0
              }
            />
            {field.state.meta.isTouched &&
              field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">
                  {field.state.meta.errors
                    .map((fieldError) => fieldError?.message ?? fieldError)
                    .join(', ')}
                </p>
              )}
          </div>
        )}
      </form.Field>
      <div className="grid grid-cols-2 gap-4">
        <form.Field name="firstName">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>First name</Label>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                maxLength={80}
                placeholder="Jane"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(changeEvent) => {
                  field.handleChange(changeEvent.target.value);
                  setSaved(false);
                }}
                aria-invalid={
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0
                }
              />
              {field.state.meta.isTouched &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors
                      .map((fieldError) => fieldError?.message ?? fieldError)
                      .join(', ')}
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
                maxLength={80}
                placeholder="Doe"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(changeEvent) => {
                  field.handleChange(changeEvent.target.value);
                  setSaved(false);
                }}
                aria-invalid={
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0
                }
              />
              {field.state.meta.isTouched &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {field.state.meta.errors
                      .map((fieldError) => fieldError?.message ?? fieldError)
                      .join(', ')}
                  </p>
                )}
            </div>
          )}
        </form.Field>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-highlight">Saved.</p>}
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving details…' : 'Save details'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
