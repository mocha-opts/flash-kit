'use client';

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps as NextThemesProviderProps,
  useTheme,
} from 'next-themes';
import type { ReactNode } from 'react';

/** Themes supported by the shared provider. `system` follows the OS preference. */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Provider options with stable class-based dark-mode defaults.
 *
 * The provider persists only the selected theme string under a versioned key; it
 * never stores server data or application state in local storage.
 */
export type ThemeProviderProps = Omit<
  NextThemesProviderProps,
  | 'attribute'
  | 'defaultTheme'
  | 'disableTransitionOnChange'
  | 'enableColorScheme'
  | 'enableSystem'
  | 'storageKey'
>;

/** Applies Light, Dark, or System theme selection to the document root. */
export function ThemeProvider({ children, ...props }: ThemeProviderProps): ReactNode {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableColorScheme
      enableSystem
      storageKey="flash-kit-theme:v1"
    >
      {children}
    </NextThemesProvider>
  );
}

export { useTheme };
