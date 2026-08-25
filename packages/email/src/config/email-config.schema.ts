import { z } from 'zod';

const senderSchema = z.string().email();

const resendEmailConfigSchema = z.object({
  provider: z.literal('resend'),
  from: senderSchema,
  apiKey: z.string().min(1),
});

const smtpEmailConfigSchema = z.object({
  provider: z.literal('smtp'),
  from: senderSchema,
  host: z.string().min(1),
  port: z.number().int().positive(),
  auth: z
    .object({
      user: z.string().min(1),
      password: z.string().min(1),
    })
    .optional(),
});

/** Package-local, provider-discriminated view of the already validated server environment. */
export const emailConfigSchema = z.discriminatedUnion('provider', [
  resendEmailConfigSchema,
  smtpEmailConfigSchema,
]);

export type EmailConfig = z.infer<typeof emailConfigSchema>;
