'use server';

import { updateCurrentDisplayName } from '@repo/auth/server';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { revalidatePath } from 'next/cache';
import { returnServerError } from 'next-safe-action';

import { authenticatedAction, getSafeActionError } from '@/lib/actions/action-clients';

import { updateDisplayNameSchema } from '../_schemas/profile.schema';

/** Updates the current user's display name and refreshes the localized profile surfaces. */
export const updateDisplayNameAction = authenticatedAction
  .inputSchema(updateDisplayNameSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const profile = await updateCurrentDisplayName(parsedInput.name);

      if (profile.id !== ctx.user.id) {
        return returnServerError(await getSafeActionError('generic'));
      }

      revalidatePath(getLocalizedPathname({ locale: ctx.locale, pathname: '/settings/profile' }));
      revalidatePath(getLocalizedPathname({ locale: ctx.locale, pathname: '/dashboard' }));

      return { name: profile.name };
    } catch {
      return returnServerError(await getSafeActionError('generic'));
    }
  });
