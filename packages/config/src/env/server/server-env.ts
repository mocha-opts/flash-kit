import 'server-only';

import { parseEnv } from '#internal/parse-env';

import { serverEnvSchema } from './server-env.schema';

/** Server-only environment parsed at module initialization; invalid configuration fails fast. */
export const serverEnv = parseEnv(serverEnvSchema, process.env, 'server env');
