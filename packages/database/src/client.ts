import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@flash-kit/env';

import * as schema from './schema';

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema });
