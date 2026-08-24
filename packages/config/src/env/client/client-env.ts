import { parseEnv } from '../../internal/parse-env';

import { clientEnvSchema } from './client-env.schema';

export const clientEnv = parseEnv(
  clientEnvSchema,
  {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  'client env',
);
