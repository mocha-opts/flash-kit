# @repo/email

## Responsibility and non-goals

`@repo/email` owns the transport-neutral mailer contract, Resend and SMTP implementations,
React Email templates, and semantic sender names. The active provider is selected once per
deployment by validated server environment variables.

It does not create queues, retries, scheduled jobs, email-log tables, or business data. Provider
SDKs stay inside private provider folders.

## Dependencies

Allowed dependencies are the shared config boundary, React Email, Resend, Nodemailer, React,
Zod, and `server-only`.

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

Provider implementations remain private. Business code imports semantic senders from
`@repo/email/server`; it never imports Resend or Nodemailer. `sendEmail` is the generic extension
point for later templates.

Magic-link calls accept `email`, `url`, optional `locale` (`en` or `zh-CN`), and optional
`expiresInMinutes` (10 by default). Delivery is awaited synchronously, and authentication email
failures always propagate to the caller.

## Security notes

Server senders do not log full recipients, magic URLs, HTML bodies, secrets, or raw provider
responses. SMTP authentication is either absent (for local Mailpit) or configured with both user
and password.

## Validation command

```bash
pnpm --filter @repo/email typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/adr/0003-no-background-jobs.md`.
