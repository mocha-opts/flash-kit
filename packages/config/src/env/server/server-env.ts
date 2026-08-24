import 'server-only';

import { parseEnv } from '#internal/parse-env';

import { serverEnvSchema } from './server-env.schema';

export const serverEnv = parseEnv(serverEnvSchema, process.env, 'server env');
