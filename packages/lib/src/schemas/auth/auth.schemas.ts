import { z } from "zod";

export const emailSchema = z.string().trim().email();

export const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  displayName: z.string().trim().max(80),
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters."),
  joinCode: z.string().trim().max(64),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const otpRequestSchema = z.object({
  email: emailSchema,
});

export const otpVerifySchema = z.object({
  email: emailSchema,
  token: z.string().trim().length(6),
});

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters."),
});
