'use server';

import { consumeCredits, getCreditBalance } from '@repo/billing/server';
import { CreditConsumptionConflictError, InsufficientCreditsError } from '@repo/billing/types';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { revalidatePath } from 'next/cache';
import { returnServerError } from 'next-safe-action';

import { authenticatedAction } from '@/lib/actions/action-clients';

import { creditConsumptionSchema } from '../_schemas/credit-consumption.schema';

/**
 * Demonstrates the protected Credit service boundary without accepting a
 * client-controlled user id. The example can be removed with this route.
 */
export const consumeCreditsAction = authenticatedAction
  .inputSchema(creditConsumptionSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const result = await consumeCredits({
        ...parsedInput,
        userId: ctx.user.id,
      });
      const balance = await getCreditBalance({ userId: ctx.user.id });

      revalidatePath(getLocalizedPathname({ locale: ctx.locale, pathname: '/examples/credits' }));

      return {
        ...result,
        balance: balance.balance,
      };
    } catch (error) {
      const translations = await getTranslations({
        locale: ctx.locale,
        namespace: 'creditDemo',
      });

      if (error instanceof InsufficientCreditsError) {
        return returnServerError({
          message: translations('errors.insufficientCredits', {
            available: formatInteger(error.available, ctx.locale),
            required: formatInteger(error.required, ctx.locale),
          }),
        });
      }

      if (error instanceof CreditConsumptionConflictError) {
        return returnServerError({ message: translations('errors.referenceConflict') });
      }

      throw error;
    }
  });

function formatInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}
