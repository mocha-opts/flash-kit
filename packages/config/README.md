# @repo/config

## Responsibility and non-goals

`@repo/config` is the only regular package that reads environment variables. It validates server env, exposes a statically whitelisted client env, and derives deployment app config and trusted URLs.

It does not own billing catalogs, OAuth plugin setup, email templates, navigation, product feature flags, or provider SDK clients.

## Dependencies

Allowed dependencies: `zod`, `server-only`, and `@repo/tsconfig`.

Forbidden dependencies: app packages, database packages, auth runtime packages, billing runtime packages, provider SDKs, React UI packages, and any package that would make client env read all of `process.env`.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/config/env/server` | `src/env/server/index.ts` | Server-only parsed env and schema. |
| `@repo/config/env/client` | `src/env/client/index.ts` | Browser-safe public env whitelist. |
| `@repo/config/app` | `src/app/index.ts` | Server-only app-level config derived from env. |
| `@repo/config/urls` | `src/urls/index.ts` | URL schemas and normalization helpers. |

## Minimal usage

```ts
import { serverEnv } from '@repo/config/env/server';
import { clientEnv } from '@repo/config/env/client';

console.log(serverEnv.BILLING_PROVIDER);
console.log(clientEnv.NEXT_PUBLIC_SITE_URL);
```

## Placement rules

Put env schemas beside the config they validate. Keep provider-specific checks conditional so unselected providers do not require secrets. Do not add a generic validation package.

## Security notes

Client env statically selects `NEXT_PUBLIC_*` fields and never receives the whole process environment. Production site URLs must be HTTPS and have no trailing slash. Missing selected-provider secrets fail at module initialization. `ENABLE_STRICT_CSP` is a server-only boolean flag that defaults to false; the Web app honors it only in production because per-request nonces require dynamic rendering.

## Validation command

```bash
pnpm --filter @repo/config typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/architecture/engineering.zh-CN.md`.
