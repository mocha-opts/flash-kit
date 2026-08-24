'use client';

import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { useTheme } from '@repo/ui/theme';

type ThemeSwitcherProps = {
  readonly label: string;
  readonly lightLabel: string;
  readonly darkLabel: string;
  readonly systemLabel: string;
};

/** Theme choices are rendered from stable labels so the first paint stays hydration-safe. */
export function ThemeSwitcher({ label, lightLabel, darkLabel, systemLabel }: ThemeSwitcherProps) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={label} className="gap-2 px-3" size="sm" variant="ghost">
          <span aria-hidden="true" className="text-base leading-none">
            ◐
          </span>
          <span className="sr-only sm:not-sr-only">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label={label} className="min-w-44">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => setTheme('light')}>{lightLabel}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme('dark')}>{darkLabel}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme('system')}>{systemLabel}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
