import 'server-only';

import { createDatabaseRuntimeNotConfiguredError } from '#client/index';

import type { DatabaseClient, DatabaseConnectionOptions } from '#client/index';

/** Test-only database handle and reset hook; production code must not import this boundary. */
export type DatabaseTestContext = {
  readonly db: DatabaseClient;
  readonly reset: () => Promise<void>;
};

/**
 * Creates an isolated database test context.
 *
 * @throws {Error} Always in T01 because the database runtime is not configured.
 */
export function createDatabaseTestContext(options: DatabaseConnectionOptions): never {
  void options;

  throw createDatabaseRuntimeNotConfiguredError();
}
