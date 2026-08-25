import 'server-only';

import { serverEnv } from '@repo/config/env/server';

import { createDatabaseClient, type DatabaseClient } from './create-client';

const DATABASE_CLIENT_KEY = Symbol.for('@repo/db.default-client');

type GlobalDatabaseState = typeof globalThis & {
  [DATABASE_CLIENT_KEY]?: DatabaseClient;
};

const globalDatabaseState: GlobalDatabaseState = globalThis;

/** One postgres.js pool is shared for the lifetime of this Node.js process. */
export const db =
  globalDatabaseState[DATABASE_CLIENT_KEY] ??
  createDatabaseClient({
    connectionString: serverEnv.DATABASE_URL,
    poolMax: serverEnv.DATABASE_POOL_MAX,
  });

globalDatabaseState[DATABASE_CLIENT_KEY] = db;
