import 'server-only';

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

import * as schema from '#db/schema/index';

export type DatabaseSchema = typeof schema;
export type DatabaseClient = PostgresJsDatabase<DatabaseSchema>;
export type DatabaseConnection = Sql;

export type DatabaseConnectionOptions = {
  readonly connectionString: string;
  readonly poolMax?: number;
  readonly prepare?: boolean;
};

/** Creates an isolated postgres.js connection and its typed Drizzle client. */
export function createDatabaseClient(options: DatabaseConnectionOptions): DatabaseClient {
  const connection = postgres(options.connectionString, {
    max: options.poolMax ?? 10,
    prepare: options.prepare ?? false,
  });

  return drizzle(connection, { schema });
}
