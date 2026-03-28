import { z } from 'zod';

export const UsernameSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/, 'Username must be lowercase alphanumeric or underscore'),
});

export const RegistrationVerifySchema = z.object({
  username: z.string().min(3).max(20),
  attestationResponse: z.any(), // SimpleWebAuthn types are complex, we'll validate the structure loosely here
});

export const AuthenticationVerifySchema = z.object({
  username: z.string().min(3).max(20),
  authenticationResponse: z.any(),
});
