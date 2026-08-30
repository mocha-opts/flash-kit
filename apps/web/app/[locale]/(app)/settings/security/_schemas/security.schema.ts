import { z } from 'zod';

export const securityLocaleSchema = z.enum(['en', 'zh-CN']);

/** Session identifier is the only client-supplied authority for targeted revocation. */
export const revokeSessionSchema = z.object({
  sessionId: z.string().uuid({ error: 'sessionInvalid' }),
});

/** Revoking other sessions derives both user id and current token on the server. */
export const revokeOtherSessionsSchema = z.object({});

/** Email-change values contain no user id or session token; callbackPath is re-sanitized server-side. */
export const emailChangeSchema = z.object({
  callbackPath: z.string().max(512, { error: 'callbackInvalid' }),
  locale: securityLocaleSchema,
  newEmail: z.email({ error: 'emailInvalid' }).transform((email) => email.trim().toLowerCase()),
});

/** The destructive action requires a deliberate, server-revalidated phrase. */
export const accountDeletionSchema = z.object({
  confirmation: z.string().refine((value) => value === 'DELETE', {
    error: 'confirmationInvalid',
  }),
});

export type EmailChangeInput = z.input<typeof emailChangeSchema>;
export type AccountDeletionInput = z.input<typeof accountDeletionSchema>;
export type RevokeSessionInput = z.input<typeof revokeSessionSchema>;
