import { z } from 'zod';

import { billingProviderCatalogIdRequirements } from './provider-capabilities';

const catalogIdentifierSchema = z
  .string()
  .trim()
  .min(1, 'Catalog identifiers must not be empty.')
  .regex(/^[a-z][a-z0-9._-]*$/u, 'Catalog identifiers must be stable lowercase slugs.');

const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/u, 'Catalog currency must be an uppercase ISO 4217 code.');

const featureSchema = z.union([
  catalogIdentifierSchema,
  z
    .object({
      id: catalogIdentifierSchema,
    })
    .strict(),
]);

const limitsSchema = z.record(
  catalogIdentifierSchema,
  z.number().int('Catalog limits must be integers.').nonnegative().nullable(),
);

const providerIdentifierSchema = z.string().trim();

const providerReferenceSchema = z
  .object({
    productId: providerIdentifierSchema,
    priceId: providerIdentifierSchema.optional(),
  })
  .strict();

const providerIdsSchema = z
  .object({
    stripe: providerReferenceSchema.optional(),
    polar: providerReferenceSchema.optional(),
  })
  .strict();

const planBaseShape = {
  id: catalogIdentifierSchema,
  name: z.string().trim().min(1, 'Catalog plan names must not be empty.'),
  features: z.array(featureSchema),
  limits: limitsSchema,
} as const;

const freePlanSchema = z
  .object({
    ...planBaseShape,
    kind: z.literal('free'),
  })
  .strict();

const paidPlanShape = {
  ...planBaseShape,
  providers: providerIdsSchema,
  cost: z.number().finite().nonnegative('Display cost must not be negative.'),
  currency: currencySchema,
} as const;

const subscriptionPlanSchema = z
  .object({
    ...paidPlanShape,
    kind: z.literal('subscription'),
    interval: z.enum(['month', 'year']),
  })
  .strict();

const lifetimePlanSchema = z
  .object({
    ...paidPlanShape,
    kind: z.literal('lifetime'),
  })
  .strict();

const creditPackagePlanSchema = z
  .object({
    ...paidPlanShape,
    kind: z.literal('credit-package'),
    credits: z.number().int('Credit packages must contain an integer credit count.').positive(),
  })
  .strict();

/** Stable discriminated union for all catalog product semantics. */
export const catalogPlanSchema = z.discriminatedUnion('kind', [
  freePlanSchema,
  subscriptionPlanSchema,
  lifetimePlanSchema,
  creditPackagePlanSchema,
]);

/**
 * Parses a complete catalog and validates only the provider selected by the
 * deployment. Missing IDs produce a path such as
 * `plans.1.providers.stripe.productId` and name the affected plan and provider.
 */
export const catalogSchema = z
  .object({
    provider: z.enum(['stripe', 'polar']),
    plans: z.array(catalogPlanSchema).min(1, 'The billing catalog must contain at least one plan.'),
  })
  .strict()
  .superRefine((catalog, context) => {
    const seenPlanIds = new Set<string>();
    const catalogIdRequirements = billingProviderCatalogIdRequirements[catalog.provider];

    for (const [index, plan] of catalog.plans.entries()) {
      if (seenPlanIds.has(plan.id)) {
        context.addIssue({
          code: 'custom',
          path: ['plans', index, 'id'],
          message: `Catalog plan id "${plan.id}" must be unique.`,
        });
      }
      seenPlanIds.add(plan.id);

      if (plan.kind === 'free') {
        continue;
      }

      const providerReference = plan.providers[catalog.provider];
      const requiredIds = Object.entries(catalogIdRequirements)
        .filter(([, required]) => required)
        .map(([id]) => id);

      for (const id of requiredIds) {
        const providerPath = `plans.${index}.providers.${catalog.provider}.${id}`;
        const value = providerReference?.[id as keyof typeof providerReference];

        if (value === undefined || value.trim() === '') {
          context.addIssue({
            code: 'custom',
            path: ['plans', index, 'providers', catalog.provider, id],
            message: `Plan "${plan.id}" for provider "${catalog.provider}" is missing ${id} at ${providerPath}.`,
          });
        }
      }
    }
  });

export type CatalogPlanSchema = z.infer<typeof catalogPlanSchema>;
export type BillingCatalogSchema = z.infer<typeof catalogSchema>;
