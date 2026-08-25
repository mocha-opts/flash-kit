# @repo/auth

## Responsibility and non-goals

`@repo/auth` owns the Better Auth server/client boundary, validated auth configuration,
database-backed session helpers, Magic Link sign-in, the admin role boundary, and auth rate limits.
T03 enables Magic Link as the only sign-in method and keeps the UI in its owning Web route.

It does not implement passwords, OTP, MFA, passkeys, organizations, invitations, impersonation,
OAuth or explicit account linking, billing integration, profile screens, or admin UI in T03.

## Dependencies

Allowed dependencies: Better Auth, Next.js and React server APIs, Zod, `server-only`,
`@repo/config`, `@repo/db`, and `@repo/email`. A later billing ticket may depend only on the
public `@repo/billing/server` integration seam.

Forbidden dependencies: billing provider SDKs, database or email private paths, app internals,
and any client export that can reach server configuration, database state, or secrets.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/auth/server` | `src/server/index.ts` | Better Auth instance, request-scoped session/user/admin helpers, session revocation, and safe callback paths. |
| `@repo/auth/client` | `src/client/index.ts` | Browser auth client and Magic Link request API. |
| `@repo/auth/config` | `src/config/index.ts` | Server-only validated auth configuration and schema. |
| `@repo/auth/components` | `src/components/index.ts` | Client component boundary types; concrete shared auth UI is not implemented in T03. |

## Minimal usage

Server code decides how an unauthenticated request is presented:

```ts
import { requireUser } from '@repo/auth/server';

const user = await requireUser();
```

A client form requests an awaited, single-use Magic Link:

```ts
import { signInWithMagicLink } from '@repo/auth/client';

await signInWithMagicLink({ email, callbackPath: '/dashboard' });
```

## Placement rules

Keep Better Auth composition in `auth.ts`, configuration in `config/`, plugin options in
`plugins/`, server request helpers in `server/`, browser APIs in `client/`, and non-public
security helpers in `internal/`. Export stable capabilities only through declared package
subpaths. Auth pages and route-specific forms remain in `apps/web/app/[locale]/auth`.

## Security notes

Magic Link tokens are hashed at rest, expire after ten minutes, and allow one atomic use.
Delivery is awaited; mail failures fail the auth request. Sessions use the database with a
30-day sliding lifetime, request-scoped React caching, secure production cookies, and no
cross-request cookie session cache. Server helpers never redirect; pages and actions own that
policy. Secrets, provider tokens, raw magic URLs, and server runtime objects must never cross a
client export.

## Validation command

```bash
pnpm --filter @repo/auth typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md`, `docs/architecture/api-and-data.zh-CN.md`, and
`docs/specs/saas-starter-foundation.md`.
