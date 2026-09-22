import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().max(80),
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
});