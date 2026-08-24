import { z } from 'zod';

import { siteUrlSchema } from '#urls/index';

/** Browser-safe allowlist; this schema must not expand to the full process environment. */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1, 'NEXT_PUBLIC_APP_NAME is required.'),
  NEXT_PUBLIC_SITE_URL: siteUrlSchema,
});

/** Inferred shape of the small public environment allowlist. */
export type ClientEnv = z.infer<typeof clientEnvSchema>;
