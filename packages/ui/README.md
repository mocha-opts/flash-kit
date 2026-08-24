# @repo/ui

## Responsibility and non-goals

`@repo/ui` owns source-controlled reusable UI primitives, semantic Tailwind CSS 4 tokens, utility helpers, and shared styles. The package keeps the public surface intentionally narrow so consumers can adopt one component family at a time.

It does not implement auth components, billing components, admin UI, project UI, state management, or product-specific layouts.

## Dependencies

Allowed dependencies: `react`, Radix primitives, CVA, `clsx`, `tailwind-merge`, `next-themes`, and Tailwind CSS when actual components require them.

Forbidden dependencies: `@repo/auth`, `@repo/billing`, `@repo/db`, `@repo/email`, app internals, provider SDKs, and server-only runtime.

## Public exports

| Export | Target | Purpose |
| --- | --- | --- |
| `@repo/ui/button` | `src/components/button.tsx` | Minimal Button component. |
| `@repo/ui/dialog` | `src/components/dialog.tsx` | Composable Radix Dialog family. |
| `@repo/ui/dropdown-menu` | `src/components/dropdown-menu.tsx` | Composable Radix DropdownMenu family. |
| `@repo/ui/theme` | `src/components/theme.tsx` | Light/Dark/System next-themes provider. |
| `@repo/ui/utils` | `src/utils/cn.ts` | Class name helper. |
| `@repo/ui/styles.css` | `src/styles/styles.css` | Shared style entry. |

## Minimal usage

```tsx
import { Button } from '@repo/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@repo/ui/dialog';
import { cn } from '@repo/ui/utils';
import '@repo/ui/styles.css';

export function SaveButton() {
  return <Button className={cn('w-full')}>Save</Button>;
}

export function ExampleDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Open details</Button>
      </DialogTrigger>
      <DialogContent closeLabel="Close dialog">Details</DialogContent>
    </Dialog>
  );
}
```

## Placement rules

Keep UI generic and reusable. Business components stay in their owning package or app route. Add new subpath exports only when the component exists.

## Security notes

This package must not import server-only runtime, secrets, auth sessions, billing state, or database clients. Interactive components should mark their own client boundary when needed.

`ThemeProvider` persists only the selected `light`, `dark`, or `system` theme string under the versioned `flash-kit-theme:v1` key. It never stores server data or application state in local storage.

## Validation command

```bash
pnpm --filter @repo/ui typecheck
```

## Architecture docs

See `docs/architecture/packages.zh-CN.md` and `docs/architecture/engineering.zh-CN.md`.
