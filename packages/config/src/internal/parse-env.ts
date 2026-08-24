import type { z } from 'zod';

export function parseEnv<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  const details = result.error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : label;

      return `${path}: ${issue.message}`;
    })
    .join('\n');

  throw new Error(`${label} validation failed:\n${details}`);
}
