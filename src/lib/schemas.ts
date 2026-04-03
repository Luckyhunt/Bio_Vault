import { z } from 'zod';

/**
 * 📦 BioVault Global Input Validation Layer (Elite Gap #4)
 * Ensures strict type safety for all external API inputs.
 */

export const UsernameSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username is too long")
    .regex(/^[a-z0-9_-]+$/, "Username can only contain lowercase letters, numbers, underscores, and hyphens"),
});

export const UserIdSchema = z.object({
  userId: z.string().uuid("Invalid User ID format"),
});

export const RegistrationGenerateSchema = z.intersection(
  UserIdSchema,
  z.object({}) // Can be extended with device names, etc.
);

export const RegistrationVerifySchema = z.intersection(
  UserIdSchema,
  z.object({
    response: z.any(), // SimpleWebAuthn response blob
  })
);

export const LoginGenerateSchema = UsernameSchema;

export const LoginVerifySchema = z.intersection(
  UsernameSchema,
  z.object({
    challenge: z.string().min(1, "Challenge is required"),
    authenticationResponse: z.any(),
  })
);

export const TransactionSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  value: z.string().regex(/^\d+(\.\d+)?$/, "Invalid numeric value"),
  data: z.string().regex(/^0x([a-fA-F0-9]*)$/, "Invalid hex data").optional(),
});
