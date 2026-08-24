import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Values accepted by the class-name combiner, including conditional and nested values. */
export type ClassValue = Parameters<typeof clsx>[number];

/** Joins class names and resolves conflicting Tailwind utilities in the caller's favor. */
export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(...values));
}
