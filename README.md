# Flash Kit

Flash Kit is a personal B2C SaaS starter in progress. T01 provides only the
minimal runnable Web and Docs apps, local development services, and environment
contract. Auth, billing, database migrations, product workflows, and the full
Fumadocs documentation site are later tickets.

## Quick Start

Requirements:

- Node.js 24.19.0
- pnpm 11.23.0 through Corepack
- Docker with Compose

Set up local configuration:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Before starting Web, fill `apps/web/.env.local` with a `BETTER_AUTH_SECRET` of
at least 32 characters and the secrets for the selected billing and mailer
providers. Enable an OAuth provider only after adding its client ID and secret.
The committed `.env` and `.env.development` files contain only public or local
non-secret defaults; they are not a substitute for `.env.local`.

Start local services:

```bash
pnpm compose:up
```

Install dependencies:

```bash
corepack enable
pnpm install
```

Run both apps:

```bash
pnpm --filter web dev
pnpm --filter docs dev
```

URLs:

- Web: http://localhost:3000
- Docs: http://localhost:3001
- PostgreSQL: localhost:54333
- Mailpit SMTP: localhost:1025
- Mailpit UI: http://localhost:8025

## Repository Map

- Architecture overview: `docs/architecture/README.zh-CN.md`
- Engineering, security, testing, and deployment: `docs/architecture/engineering.zh-CN.md`
- Package exports and boundaries: `docs/architecture/packages.zh-CN.md`
- Product foundation spec: `docs/specs/saas-starter-foundation.md`
- ADRs: `docs/adr/`
