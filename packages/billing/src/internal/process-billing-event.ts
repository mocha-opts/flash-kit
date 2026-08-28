import 'server-only';

import { type DatabaseTransaction, db, withTransaction } from '@repo/db/client';
import {
  claimBillingEvent,
  markBillingEventFailed,
  markBillingEventIgnored,
  markBillingEventProcessed,
  type UpsertBillingEventInput,
  upsertBillingEvent,
} from '@repo/db/queries/billing';

export type BillingEventFailure = {
  readonly code: string;
  readonly message: string;
};

export type BillingEventDisposition = 'processed' | 'ignored';

export type ProcessBillingEventInput<Resolution> = {
  readonly identity: UpsertBillingEventInput;
  readonly resolve: () => Promise<Resolution>;
  readonly apply: (
    transaction: DatabaseTransaction,
    resolution: Resolution,
  ) => Promise<BillingEventDisposition>;
  readonly failure: BillingEventFailure;
  readonly createProcessingError: (cause: unknown) => Error;
};

/**
 * Runs the shared Billing Event lifecycle around one provider adapter.
 * Provider I/O resolves before the short claim transaction; failures are
 * recorded with fixed safe text and rethrown so the provider can redeliver.
 */
export async function processBillingEvent<Resolution>(
  input: ProcessBillingEventInput<Resolution>,
): Promise<void> {
  try {
    const event = await upsertBillingEvent(db, input.identity);

    if (isTerminalEvent(event.status)) {
      return;
    }

    const resolution = await input.resolve();

    await withTransaction(db, async (transaction) => {
      const claim = await claimBillingEvent(transaction, input.identity);

      if (!claim.shouldProcess) {
        return;
      }

      const disposition = await input.apply(transaction, resolution);

      if (disposition === 'ignored') {
        await markBillingEventIgnored(transaction, claim.event.id);
        return;
      }

      await markBillingEventProcessed(transaction, claim.event.id);
    });
  } catch (cause) {
    await markFailure(input.identity, input.failure);
    throw input.createProcessingError(cause);
  }
}

function isTerminalEvent(status: string): boolean {
  return status === 'processed' || status === 'ignored';
}

async function markFailure(
  identity: UpsertBillingEventInput,
  failure: BillingEventFailure,
): Promise<void> {
  try {
    await markBillingEventFailed(db, {
      provider: identity.provider,
      providerEventId: identity.providerEventId,
      errorCode: failure.code,
      errorMessage: failure.message,
    });
  } catch {
    // Preserve the adapter-owned processing error so the provider can redeliver.
  }
}
