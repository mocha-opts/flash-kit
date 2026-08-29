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

/** Result of one delivery after the event row has been claimed. */
export type BillingEventProcessResult = {
  readonly status: BillingEventDisposition | 'duplicate';
};

export type ProcessBillingEventInput<Resolution> = {
  readonly identity: UpsertBillingEventInput;
  readonly resolve: () => Promise<Resolution>;
  readonly apply: (
    transaction: DatabaseTransaction,
    resolution: Resolution,
  ) => Promise<BillingEventDisposition>;
  readonly failure: BillingEventFailure;
  readonly createProcessingError: (cause: unknown) => Error;
  /**
   * Runs after the business transaction has committed. This is deliberately
   * outside the failure boundary so a notification cannot mark the Billing
   * Event failed or trigger provider redelivery.
   */
  readonly notifyAfterCommit?: (resolution: Resolution) => Promise<void>;
};

/**
 * Runs the shared Billing Event lifecycle around one provider adapter.
 * Provider I/O resolves before the short claim transaction; failures are
 * recorded with fixed safe text and rethrown so the provider can redeliver.
 */
export async function processBillingEvent<Resolution>(
  input: ProcessBillingEventInput<Resolution>,
): Promise<BillingEventProcessResult> {
  let committed: {
    readonly resolution: Resolution;
    readonly result: BillingEventProcessResult;
  } | null = null;

  try {
    const event = await upsertBillingEvent(db, input.identity);

    if (isTerminalEvent(event.status)) {
      return { status: 'duplicate' };
    }

    const resolution = await input.resolve();
    let claimed = false;
    let disposition: BillingEventDisposition = 'ignored';

    await withTransaction(db, async (transaction) => {
      const claim = await claimBillingEvent(transaction, input.identity);

      if (!claim.shouldProcess) {
        return;
      }

      claimed = true;
      disposition = await input.apply(transaction, resolution);

      if (disposition === 'ignored') {
        await markBillingEventIgnored(transaction, claim.event.id);
        return;
      }

      await markBillingEventProcessed(transaction, claim.event.id);
    });

    if (claimed) {
      committed = {
        resolution,
        result: { status: disposition },
      };
    }
  } catch (cause) {
    await markFailure(input.identity, input.failure);
    throw input.createProcessingError(cause);
  }

  if (!committed) {
    return { status: 'duplicate' };
  }

  // Keep this await outside the processing try/catch: notification failures
  // are auxiliary and must never change the durable Billing Event outcome.
  if (committed.result.status === 'processed' && input.notifyAfterCommit) {
    try {
      await input.notifyAfterCommit(committed.resolution);
    } catch {
      try {
        logNotificationFailure(input.identity);
      } catch {
        // A safe log write failure must not escape to the provider either.
      }
    }
  }

  return committed.result;
}

/**
 * Logs only fixed, non-sensitive routing fields. In particular, never attach
 * the callback error because provider errors can contain recipients, payloads
 * or secrets.
 */
function logNotificationFailure(identity: UpsertBillingEventInput): void {
  console.error('Billing notification callback failed.', {
    category: 'billing_notification_callback_failed',
    provider: identity.provider,
    eventType: identity.eventType,
  });
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
