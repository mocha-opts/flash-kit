# @repo/auth

## Responsibility and non-goals

`@repo/auth` owns the Better Auth server/client boundary, validated auth configuration,
database-backed session helpers, Magic Link and configured Google/GitHub sign-in, explicit account
linking, the admin role boundary, safe Admin user/session mutations, auth rate limits, and the
Profile/Security server capabilities, including the fresh-session account-deletion boundary.
Profile updates target the Better Auth `user` row directly; Session view models omit session tokens.

It does not implement passwords, OTP, MFA, passkeys, organizations, invitations, impersonation,
billing policy, provider SDKs, or admin UI. Its only Billing integration is
installing the official Better Auth plugin returned by the public `@repo/billing/server` seam and
injecting the two semantic Billing email senders at that composition root.

## Dependencies

Allowed dependencies: Better Auth and its pinned core transaction context, Next.js and React server APIs, Zod, `server-only`,
`@repo/config`, `@repo/db`, `@repo/email`, and `@repo/billing` (server-only, through
`@repo/billing/server` for the official plugin seam).

Forbidden dependencies: billing provider SDKs, database or email private paths, app internals,
and any client export that can reach server configuration, database state, or secrets.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/auth/server` | `src/server/index.ts` | Better Auth instance, request-scoped session/user/admin helpers, safe linked-account summaries, Profile/Session view and mutation helpers, Admin ban/unban/session revocation, email-change request, fresh-session account deletion, session revocation, and safe callback paths. |
| `@repo/auth/client` | `src/client/index.ts` | Restricted Magic Link, social sign-in, explicit social-link, and unlink request APIs; no raw auth client or provider-token API. |
| `@repo/auth/config` | `src/config/index.ts` | Server-only validated auth configuration, schema, and enabled OAuth provider contract. |
| `@repo/auth/components` | `src/components/index.ts` | Client component boundary types; route-specific sign-in and Security UI stays in the Web app. |

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

Configured OAuth sign-in and explicit linking use the restricted client operations:

```ts
import { linkSocialAccount, signInWithSocial } from '@repo/auth/client';

await signInWithSocial({ provider: 'google', callbackPath: '/dashboard' });
await linkSocialAccount({ provider: 'github', callbackPath: '/settings/security' });
```

## Placement rules

Keep Better Auth composition in `auth.ts`, configuration in `config/`, provider/plugin options in
`plugins/`, server request helpers in `server/`, browser APIs in `client/`, and non-public security
helpers in `internal/`. Export stable capabilities only through declared package subpaths. Auth
pages and route-specific forms remain in `apps/web/app/[locale]/auth`; the T04 account-linking
surface is `apps/web/app/[locale]/(app)/settings/security`.

### Explicit Admin bootstrap and revoke

Admin access is never inferred from an email address or domain. Grant or revoke the role only
through a deliberate, reviewed database operation against an exact user id:

1. Resolve the target id from the authenticated `user` table and review the exact row before changing it.
2. In a transaction, update only `user.role` for that exact id to `admin` (or `user` to revoke it).
3. Check the affected-row count is exactly one, then query the same id again and verify the stored role.
4. Keep the SQL/audit output out of source control and do not run a broad email/domain update.

For example, run the following manually from a protected database session after replacing the
placeholder id. Do not turn this into an automatic bootstrap script:

```sql
BEGIN;

SELECT id, email, role
FROM "user"
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
FOR UPDATE;

-- Confirm the client reports exactly one affected row, then inspect the returned row.
UPDATE "user"
SET role = 'admin', updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
RETURNING id, email, role;

COMMIT;
```

To revoke the role, repeat the same reviewed flow with `SET role = 'user'`. The Admin UI does not
grant or revoke roles. Better Auth's installed Admin Plugin handles ban/unban and session
revocation; in version 1.7.1 `banUser` also deletes all sessions for the target before returning.

## Security notes

Magic Link tokens are hashed at rest, expire after ten minutes, and allow one atomic use.
Delivery is awaited; mail failures fail the auth request. Sessions use the database with a
30-day sliding lifetime, request-scoped React caching, secure production cookies, and no
cross-request cookie session cache. OAuth providers are included only when their enabled flag and
complete server credentials pass validation. Better Auth encrypts OAuth tokens with AES-256-GCM;
account linking is explicit, trusted-provider-only, same-email-only, preserves local user info,
and refuses to unlink the last account. Server helpers never redirect; pages and actions own that
policy. Secrets, provider tokens, raw magic URLs, account ids other than local record ids, and
server runtime objects must never cross a client export.

Email changes use the custom Better Auth endpoint in `plugins/email-change.ts`, not the built-in
change-email hook: the recent-session request creates a hashed, one-use, expiring verification
record and awaits both localized messages. Verification consumes the record, updates the email,
and revokes all sessions except the initiating session in one Better Auth adapter transaction;
success and failure redirects contain only fixed status flags.

Account deletion deliberately keeps Better Auth's generic `/delete-user` endpoint disabled. The
confirmed application action performs the Provider-neutral Billing preflight first, then
`deleteCurrentUserAccount` re-reads the authoritative Better Auth session, applies the configured
freshness window, and calls the narrow DB deletion query. A client-provided user id is never
accepted.

Billing notifications are composed in `plugins/billing.ts`: provider-neutral receipt and
payment-failed facts from `@repo/billing/server` are mapped to the semantic senders exported by
`@repo/email/server`. Auth does not receive Provider SDK objects and does not send from inside a
Billing transaction. Auxiliary delivery failures are isolated by the Billing/Email boundaries and
cannot change committed Purchase, Credit, Billing Event, or Provider-owned Subscription facts.

## Validation command

```bash
pnpm --filter @repo/auth typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md`, `docs/architecture/api-and-data.zh-CN.md`, and
`docs/specs/saas-starter-foundation.md`.
