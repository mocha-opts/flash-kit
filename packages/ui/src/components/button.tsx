import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '#utils/cn';

/** Native button attributes plus the small variant set supported by this primitive. */
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: 'primary' | 'secondary';
  readonly children: ReactNode;
};

/** Renders a reusable button with a submit-safe default `type="button"`. */
export function Button({
  className,
  variant = 'primary',
  type = 'button',
  children,
  ...props
}: ButtonProps): ReactNode {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium',
        variant === 'primary' && 'bg-zinc-950 text-white',
        variant === 'secondary' && 'border border-zinc-300 bg-white text-zinc-950',
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
