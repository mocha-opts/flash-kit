# @repo/db

## Responsibility and non-goals

`@repo/db` owns the future database client boundary, schema exports, grouped query exports, and database test helpers. T01 only provides honest typed boundaries so public imports resolve before schema and query tickets exist.

It does not define tables, migrations, repositories, auth flows, billing workflows, or business queries in this task.

## Dependencies

Allowed dependencies: `server-only` and future database libraries selected by the database implementation ticket.

Forbidden dependencies: `@repo/auth`, `@repo/billing`, email packages, UI packages, provider SDKs, and app internals.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/db/client` | `src/client/index.ts` | Server-only database client types and fail-fast runtime boundary. |
| `@repo/db/schema` | `src/schema/index.ts` | Server-only schema type boundary. |
| `@repo/db/queries/users` | `src/queries/users/index.ts` | Server-only user query type boundary. |
| `@repo/db/queries/billing` | `src/queries/billing/index.ts` | Server-only billing query type boundary. |
| `@repo/db/queries/example` | `src/queries/example/index.ts` | Server-only example query type boundary. |
| `@repo/db/testing` | `src/testing/index.ts` | Server-only database test context types and fail-fast runtime boundary. |

## Minimal usage

```ts
import type { DatabaseConnectionOptions } from '@repo/db/client';

const connectionOptions: DatabaseConnectionOptions = {
  connectionString: process.env.DATABASE_URL ?? '',
  prepare: false,
};
```

## Placement rules

Place generated Better Auth schema in future `schema/core.ts` and custom schema elsewhere. Keep reusable named queries under `queries/*`. Do not add a generic repository layer.

## Security and transaction notes

Every runtime export is server-only. User-scoped queries must include trusted `userId` predicates when real queries are added. Billing atomic workflows belong to `@repo/billing`, not this package.

## Validation command

```bash
pnpm --filter @repo/db typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md`, `docs/architecture/api-and-data.zh-CN.md`, and `docs/adr/0005-application-level-authorization.md`.
