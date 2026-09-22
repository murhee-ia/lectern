import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().max(80),
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
});

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;