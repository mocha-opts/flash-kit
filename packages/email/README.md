# @repo/email

## Responsibility and non-goals

`@repo/email` owns transport-neutral mailer contracts, semantic sender names, and the future email template boundary. T01 intentionally stops before provider SDKs and real templates.

It does not create Resend or SMTP clients, queues, retry systems, email logs, business tables, or product email copy in this task.

## Dependencies

Allowed dependencies: `server-only`, `react` for environment-neutral template descriptors, and future mail provider SDKs inside private provider folders.

Forbidden dependencies: app internals, database tables for email logging, background job libraries, billing provider SDKs outside billing, and browser UI components.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/email/server` | `src/server.ts` | Server-only transport-neutral mailer and semantic sender contracts. |
| `@repo/email/templates` | `src/templates/index.ts` | Environment-neutral template descriptor types. |

## Minimal usage

```ts
import type { EmailTemplateDescriptor } from '@repo/email/templates';

const template: EmailTemplateDescriptor = {
  kind: 'custom',
  previewText: 'Welcome',
};
```

## Placement rules

Provider implementations belong under private provider folders in a later ticket. Auth, billing, and product senders should remain semantic entry points rather than leaking provider APIs.

## Security notes

Server senders must not log full recipients, tokens, HTML bodies, secrets, or raw provider responses. Auth email failures should throw once real sending exists; auxiliary mail must not roll back committed payment facts.

## Validation command

```bash
pnpm --filter @repo/email typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/adr/0003-no-background-jobs.md`.
