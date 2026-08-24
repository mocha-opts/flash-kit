# @repo/auth

## Responsibility and non-goals

`@repo/auth` owns the future Better Auth server/client boundary, session/user/admin helpers, auth configuration, and auth UI entry points. T01 only creates honest contracts and does not instantiate Better Auth.

It does not implement password auth, OTP, MFA, passkeys, organizations, invitations, impersonation, provider linking, login flows, or billing provider logic in this task.

## Dependencies

Allowed dependencies: `server-only`, `react` for component boundaries, `@repo/config`, `@repo/db`, `@repo/email`, and `@repo/billing/server` in later auth implementation work.

Forbidden dependencies: billing provider SDKs, database private paths, app internals, and any client export that can reach server runtime.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/auth/server` | `src/server/index.ts` | Server-only auth/session boundary names. |
| `@repo/auth/client` | `src/client/index.ts` | Client-only auth client type boundary. |
| `@repo/auth/config` | `src/config/index.ts` | Auth provider and session config types. |
| `@repo/auth/components` | `src/components/index.ts` | Client auth component type boundary. |

## Minimal usage

```ts
import type { AuthSession } from '@repo/auth/server';

type PageSession = AuthSession | null;
```

## Placement rules

Keep Better Auth server setup in server-only files. Keep browser hooks and components in client entries. Billing integration must use only `createBetterAuthBillingPlugin()` from `@repo/billing/server`.

## Security notes

Session helpers must never redirect; pages and actions decide redirects and error conversion. OAuth tokens, cookies, magic links, and provider secrets must never be exposed through client exports.

## Validation command

```bash
pnpm --filter @repo/auth typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/specs/saas-starter-foundation.md`.
