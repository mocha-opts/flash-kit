/** Values accepted by the lightweight class-name combiner. */
export type ClassValue = string | false | null | undefined;

/** Joins string classes in order and omits false, null, and undefined values. */
export function cn(...values: readonly ClassValue[]): string {
  return values.filter((value): value is string => typeof value === 'string').join(' ');
}
