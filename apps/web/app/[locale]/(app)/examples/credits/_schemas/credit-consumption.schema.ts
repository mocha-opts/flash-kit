import { z } from 'zod';

const POSTGRES_INTEGER_MAX = 2_147_483_647;

/**
 * Client-facing contract for the removable Credit consumption example.
 *
 * `userId` is deliberately absent: the Server Action takes it only from the
 * authenticated Better Auth session. The limits mirror the Billing service
 * contract so invalid input is rejected before the mutation is called.
 */
export const creditConsumptionSchema = z
  .strictObject({
    amount: z
      .number({ error: 'amountInvalid' })
      .int({ error: 'amountInvalid' })
      .min(1, { error: 'amountRequired' })
      .max(POSTGRES_INTEGER_MAX, { error: 'amountTooLarge' }),
    referenceType: z
      .string({ error: 'referenceTypeInvalid' })
      .trim()
      .min(1, { error: 'referenceTypeRequired' })
      .max(100, { error: 'referenceTypeTooLong' })
      .regex(/^[a-z][a-z0-9_:-]*$/u, { error: 'referenceTypeInvalid' })
      .refine((value) => !['adjustment', 'purchase', 'refund'].includes(value), {
        error: 'referenceTypeReserved',
      }),
    referenceId: z
      .string({ error: 'referenceIdInvalid' })
      .trim()
      .min(1, { error: 'referenceIdRequired' })
      .max(255, { error: 'referenceIdTooLong' }),
    description: z
      .string({ error: 'descriptionInvalid' })
      .trim()
      .min(1, { error: 'descriptionRequired' })
      .max(500, { error: 'descriptionTooLong' }),
  })
  .describe('Credit consumption example input');

export type CreditConsumptionFormInput = z.input<typeof creditConsumptionSchema>;
