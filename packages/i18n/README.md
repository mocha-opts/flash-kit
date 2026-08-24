# @repo/i18n

## Responsibility and non-goals

`@repo/i18n` owns locale constants, routing helpers, navigation helpers, and minimal server/client adapter boundaries. English is the default unprefixed locale and Simplified Chinese uses the `zh-CN` prefix.

It does not own product message files, email copy, profile timezone storage, or web route content.

## Dependencies

Allowed dependencies: `server-only`, `react` for provider boundaries, and future `next-intl` integration when the web app exists.

Forbidden dependencies: app message files, email templates, auth runtime, billing runtime, database clients, and UI business components.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/i18n/config` | `src/config/index.ts` | Locale constants and type guards. |
| `@repo/i18n/routing` | `src/routing/index.ts` | Routing configuration and URL locale parsing. |
| `@repo/i18n/navigation` | `src/navigation/index.ts` | Locale-aware pathname helpers. |
| `@repo/i18n/server` | `src/server/index.ts` | Server-only request locale boundary. |
| `@repo/i18n/client` | `src/client/index.ts` | Client provider and hook type boundary. |

## Minimal usage

```ts
import { locales } from '@repo/i18n/config';
import { getLocalizedPathname } from '@repo/i18n/navigation';

console.log(locales);
console.log(getLocalizedPathname({ locale: 'zh-CN', pathname: '/pricing' }));
```

## Placement rules

Keep locale infrastructure here. Product messages belong to `apps/web`; email messages belong to `@repo/email`.

## Security notes

Locale selection is not an authorization boundary. Server resolution follows URL locale, then cookie locale, then the default locale.

## Validation command

```bash
pnpm --filter @repo/i18n typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/specs/saas-starter-foundation.md`.
