import { z } from "zod";

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Invalid email"));

export const registerBody = z.object({
  email,
  password: z
    .string()
    .min(8, "Password must have at least 8 characters")
    .max(256),
  name: z.string().trim().min(1, "Name is required").max(100),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1).max(256),
});

export const googleBody = z.object({
  idToken: z.string().min(20).max(8192),
});

export const refreshBody = z.object({
  refreshToken: z.string().min(16).max(256),
});

export const updateMeBody = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

/** DELETE /api/me: no body at all is fine (Google-only accounts). */
export const deleteMeBody = z
  .object({ password: z.string().min(1).max(256).optional() })
  .optional()
  .transform((body) => body ?? {});
