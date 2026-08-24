import 'server-only';

export const databaseRuntimeNotConfiguredMessage =
  'T01-not-configured: database runtime is not configured in the package boundary scaffold. Implement the database provider before using this runtime API.';

export function createDatabaseRuntimeNotConfiguredError(): Error {
  return new Error(databaseRuntimeNotConfiguredMessage);
}

export type DatabaseConnectionOptions = {
  connectionString: string;
  poolMax?: number;
  prepare?: boolean;
};

declare const databaseClientBrand: unique symbol;
declare const databaseTransactionBrand: unique symbol;

export type DatabaseClient = {
  readonly [databaseClientBrand]: 'database-client-not-implemented-in-t01';
};

export type DatabaseTransaction<TClient = DatabaseClient> = {
  readonly [databaseTransactionBrand]: TClient;
};

export function createDatabaseClient(options: DatabaseConnectionOptions): never {
  void options;

  throw createDatabaseRuntimeNotConfiguredError();
}

export function createDatabaseTransaction<TClient>(client: TClient): never {
  void client;

  throw createDatabaseRuntimeNotConfiguredError();
}
