"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

import { Button } from "@repo/ui/components/ui/button";
import { AVATAR_ALLOWED_MIME_TYPES, AVATAR_MAX_BYTES } from "@repo/lib/schemas/profile";
import { createBrowserSupabaseClient } from "@repo/supabase/browser";

import { setAvatarAction } from "@/lib/actions/auth/auth.actions";

export function AvatarUpload({
  userId,
  initialAvatarUrl,
  displayName,
}: {
  userId: string;
  initialAvatarUrl: string | null;
  displayName: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleFileChange = (changeEvent: ChangeEvent<HTMLInputElement>) => {
    const file = changeEvent.target.files?.[0];
    changeEvent.target.value = "";
    if (!file) return;

    setError(null);

    if (!AVATAR_ALLOWED_MIME_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_MIME_TYPES)[number])) {
      setError("Please choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("Image must be 5MB or smaller.");
      return;
    }

    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${userId}/avatar`, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);

      const result = await setAvatarAction();
      if (result?.error) {
        setError(result.error);
        setAvatarUrl(initialAvatarUrl);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-lectern-white/15 bg-lectern-white/10 text-lg font-semibold text-foreground">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a user-uploaded image so can't use next/image
            <img src={avatarUrl} alt="profile-avatar" className="size-full object-cover" />
          ) : (
            initials || "?"
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glass-sm"
          aria-label="Change photo"
        >
          <Camera className="size-3.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={AVATAR_ALLOWED_MIME_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
        >
          {isPending ? "Uploading…" : "Change photo"}
        </Button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
