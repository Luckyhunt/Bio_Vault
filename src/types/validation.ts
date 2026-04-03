import { z } from 'zod';

/**
 * 🔐 BioVault Domain Validation Schemas
 * Reusable logic for authentication, transactions, and user metadata.
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

export const TransactionSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  value: z.string().regex(/^\d+(\.\d+)?$/, "Invalid numeric value"),
  data: z.string().regex(/^0x([a-fA-F0-9]*)$/, "Invalid hex data").optional(),
});
