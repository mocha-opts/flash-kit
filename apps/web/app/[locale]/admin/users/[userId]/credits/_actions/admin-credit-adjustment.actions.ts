'use server';

import { adjustCredits } from '@repo/billing/server';
import { locales } from '@repo/i18n/config';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { revalidatePath } from 'next/cache';

import { adminAction } from '@/lib/actions/action-clients';

import { adminCreditAdjustmentSchema } from '../_schemas/admin-credit-adjustment.schema';

/**
 * Applies one support adjustment. The actor id comes only from the verified
 * Admin session; reference generation remains inside the Billing package.
 */
export const adjustUserCreditsAction = adminAction
  .inputSchema(adminCreditAdjustmentSchema)
  .action(async ({ ctx, parsedInput }) => {
    const result = await adjustCredits({
      userId: parsedInput.userId,
      actorUserId: ctx.user.id,
      amount: parsedInput.amount,
      reason: parsedInput.reason,
    });

    for (const locale of locales) {
      revalidatePath(
        getLocalizedPathname({
          locale,
          pathname: `/admin/users/${parsedInput.userId}/credits`,
        }),
      );
      revalidatePath(getLocalizedPathname({ locale, pathname: '/settings/billing' }));
    }

    return result;
  });
