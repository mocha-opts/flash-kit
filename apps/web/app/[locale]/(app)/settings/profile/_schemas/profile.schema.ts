import { z } from 'zod';

/** Shared display-name contract used by both the client form and Server Action. */
export const updateDisplayNameSchema = z.strictObject({
  name: z
    .string({ error: 'nameInvalid' })
    .trim()
    .min(1, { error: 'nameRequired' })
    .max(80, { error: 'nameTooLong' }),
});

export type UpdateDisplayNameInput = z.input<typeof updateDisplayNameSchema>;
