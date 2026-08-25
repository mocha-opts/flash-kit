import 'server-only';

import {
  createDatabaseClient,
  type DatabaseClient,
  type DatabaseConnectionOptions,
} from '#db/client/index';

export type DatabaseTestContext = {
  readonly db: DatabaseClient;
  readonly reset: () => Promise<void>;
};

/** Creates a test client; callers own schema reset and connection cleanup. */
export function createDatabaseTestContext(options: DatabaseConnectionOptions): DatabaseTestContext {
  return {
    db: createDatabaseClient(options),
    reset: async () => undefined,
  };
}
