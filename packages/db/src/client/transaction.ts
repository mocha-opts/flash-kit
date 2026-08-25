import 'server-only';

import type { DatabaseClient } from './create-client';

export type DatabaseTransaction = Parameters<Parameters<DatabaseClient['transaction']>[0]>[0];

/** Runs a callback in a Drizzle transaction. */
export async function withTransaction<T>(
  database: DatabaseClient,
  callback: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return await database.transaction(callback);
}
