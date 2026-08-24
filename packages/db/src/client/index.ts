import 'server-only';

/** Stable error text for every database runtime placeholder in T01. */
export const databaseRuntimeNotConfiguredMessage =
  'T01-not-configured: database runtime is not configured in the package boundary scaffold. Implement the database provider before using this runtime API.';

/** Creates the standard fail-fast error for an unconfigured database runtime. */
export function createDatabaseRuntimeNotConfiguredError(): Error {
  return new Error(databaseRuntimeNotConfiguredMessage);
}

/** Connection settings for a database client; pool and prepare options are runtime-specific. */
export type DatabaseConnectionOptions = {
  connectionString: string;
  poolMax?: number;
  prepare?: boolean;
};

declare const databaseClientBrand: unique symbol;
declare const databaseTransactionBrand: unique symbol;

/** Opaque database client boundary; the concrete driver is intentionally private. */
export type DatabaseClient = {
  readonly [databaseClientBrand]: 'database-client-not-implemented-in-t01';
};

/** Opaque transaction boundary associated with a client-like value. */
export type DatabaseTransaction<TClient = DatabaseClient> = {
  readonly [databaseTransactionBrand]: TClient;
};

/**
 * Creates a database client for tests, scripts, or a special deployment.
 *
 * @throws {Error} Always in T01 because the database runtime is not configured.
 */
export function createDatabaseClient(options: DatabaseConnectionOptions): never {
  void options;

  throw createDatabaseRuntimeNotConfiguredError();
}

/**
 * Creates a transaction boundary for a database client.
 *
 * @throws {Error} Always in T01 because the database runtime is not configured.
 */
export function createDatabaseTransaction<TClient>(client: TClient): never {
  void client;

  throw createDatabaseRuntimeNotConfiguredError();
}
