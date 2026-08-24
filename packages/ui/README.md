# @repo/ui

## Responsibility and non-goals

`@repo/ui` owns source-controlled reusable UI primitives, utility helpers, and shared styles. T01 provides only a minimal `Button`, `cn`, and stylesheet export to prove the package boundary.

It does not implement the future component suite, auth components, billing components, admin UI, project UI, state management, or product-specific layouts.

## Dependencies

Allowed dependencies: `react` and future UI-only libraries such as Radix primitives or CVA when actual components require them.

Forbidden dependencies: `@repo/auth`, `@repo/billing`, `@repo/db`, `@repo/email`, app internals, provider SDKs, and server-only runtime.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/ui/button` | `src/components/button.tsx` | Minimal Button component. |
| `@repo/ui/utils` | `src/utils/cn.ts` | Class name helper. |
| `@repo/ui/styles.css` | `src/styles/styles.css` | Shared style entry. |

## Minimal usage

```tsx
import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/utils';
import '@repo/ui/styles.css';

export function SaveButton() {
  return <Button className={cn('w-full')}>Save</Button>;
}
```

## Placement rules

Keep UI generic and reusable. Business components stay in their owning package or app route. Add new subpath exports only when the component exists.

## Security notes

This package must not import server-only runtime, secrets, auth sessions, billing state, or database clients. Interactive components should mark their own client boundary when needed.

## Validation command

```bash
pnpm --filter @repo/ui typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/architecture/engineering.zh-CN.md`.
