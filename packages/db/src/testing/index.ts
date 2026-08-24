import 'server-only';

import { createDatabaseRuntimeNotConfiguredError } from '#client/index';

import type { DatabaseClient, DatabaseConnectionOptions } from '#client/index';

export type DatabaseTestContext = {
  readonly db: DatabaseClient;
  readonly reset: () => Promise<void>;
};

export function createDatabaseTestContext(options: DatabaseConnectionOptions): never {
  void options;

  throw createDatabaseRuntimeNotConfiguredError();
}
