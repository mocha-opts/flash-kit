import { z } from 'zod';

import { siteUrlSchema } from '../../urls/index';

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1, 'NEXT_PUBLIC_APP_NAME is required.'),
  NEXT_PUBLIC_SITE_URL: siteUrlSchema,
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
