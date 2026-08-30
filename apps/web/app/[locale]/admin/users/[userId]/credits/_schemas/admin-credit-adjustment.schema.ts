import { z } from 'zod';

const POSTGRES_INTEGER_MIN = -2_147_483_648;
const POSTGRES_INTEGER_MAX = 2_147_483_647;

/**
 * Browser-facing Admin adjustment contract. The actor and ledger reference are
 * deliberately absent because the Server Action owns both values.
 */
export const adminCreditAdjustmentSchema = z.strictObject({
  userId: z.string().uuid({ error: 'userInvalid' }),
  amount: z
    .number({ error: 'amountInvalid' })
    .int({ error: 'amountInvalid' })
    .min(POSTGRES_INTEGER_MIN, { error: 'amountTooSmall' })
    .max(POSTGRES_INTEGER_MAX, { error: 'amountTooLarge' })
    .refine((value) => value !== 0, { error: 'amountRequired' }),
  reason: z
    .string({ error: 'reasonInvalid' })
    .trim()
    .min(1, { error: 'reasonRequired' })
    .max(500, { error: 'reasonTooLong' }),
});

export type AdminCreditAdjustmentFormInput = z.input<typeof adminCreditAdjustmentSchema>;
