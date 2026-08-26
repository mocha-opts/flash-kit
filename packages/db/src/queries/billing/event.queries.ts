import 'server-only';

import { and, eq, inArray, sql } from 'drizzle-orm';

import type { DatabaseClient, DatabaseTransaction } from '#db/client/index';
import { type BillingEventStatus, type BillingProvider, billingEvent } from '#db/schema/index';

export type BillingEventRecord = typeof billingEvent.$inferSelect;

/** Input captured after the official Provider adapter has verified a webhook. */
export type UpsertBillingEventInput = {
  readonly provider: BillingProvider;
  readonly providerEventId: string;
  readonly eventType: string;
  readonly receivedAt?: Date;
};

/** Key used to find a Provider event across delivery attempts. */
export type BillingEventIdentity = Pick<UpsertBillingEventInput, 'provider' | 'providerEventId'>;

/** Event claim result used by the Billing transaction orchestrator. */
export type BillingEventClaim = {
  readonly event: BillingEventRecord;
  readonly shouldProcess: boolean;
};

/**
 * Upserts the PII-free event row. Use the default client before the business
 * transaction when a failed delivery must remain durable; a transaction is
 * also accepted when the caller needs to compose upsert and claim atomically.
 */
export async function upsertBillingEvent(
  database: DatabaseClient | DatabaseTransaction,
  input: UpsertBillingEventInput,
): Promise<BillingEventRecord> {
  const receivedAt = input.receivedAt ?? new Date();
  const rows = await database
    .insert(billingEvent)
    .values({
      provider: input.provider,
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      receivedAt,
      lastReceivedAt: receivedAt,
    })
    .onConflictDoUpdate({
      target: [billingEvent.provider, billingEvent.providerEventId],
      set: {
        deliveryCount: sql`${billingEvent.deliveryCount} + 1`,
        lastReceivedAt: receivedAt,
      },
    })
    .returning();
  const event = rows[0];

  if (!event) {
    throw new Error('The billing event upsert did not return an event row.');
  }

  return event;
}

/**
 * Locks an event row in the caller's transaction and decides whether to run
 * business processing. Terminal events are deduplicated without side effects.
 */
export async function claimBillingEvent(
  transaction: DatabaseTransaction,
  identity: BillingEventIdentity,
): Promise<BillingEventClaim> {
  const rows = await transaction
    .select()
    .from(billingEvent)
    .where(
      and(
        eq(billingEvent.provider, identity.provider),
        eq(billingEvent.providerEventId, identity.providerEventId),
      ),
    )
    .for('update')
    .limit(1);
  const event = rows[0];

  if (!event) {
    throw new Error('The billing event must be upserted before it can be claimed.');
  }

  if (event.status === 'processed' || event.status === 'ignored') {
    return { event, shouldProcess: false };
  }

  if (event.status !== 'failed') {
    return { event, shouldProcess: true };
  }

  const resetRows = await transaction
    .update(billingEvent)
    .set({
      status: 'received',
      errorCode: null,
      errorMessage: null,
      processedAt: null,
    })
    .where(eq(billingEvent.id, event.id))
    .returning();
  const resetEvent = resetRows[0];

  if (!resetEvent) {
    throw new Error('The failed billing event could not be reclaimed.');
  }

  return { event: resetEvent, shouldProcess: true };
}

/** Marks the claimed event processed in the same transaction as business writes. */
export async function markBillingEventProcessed(
  transaction: DatabaseTransaction,
  eventId: string,
): Promise<BillingEventRecord> {
  return await markTerminalBillingEvent(transaction, eventId, 'processed');
}

/** Marks a claimed event ignored in the same transaction as any related writes. */
export async function markBillingEventIgnored(
  transaction: DatabaseTransaction,
  eventId: string,
): Promise<BillingEventRecord> {
  return await markTerminalBillingEvent(transaction, eventId, 'ignored');
}

/**
 * Records a safe failure category in a short independent database operation.
 * Raw Provider payloads, Error objects, stack traces, and user data are not
 * accepted by this boundary.
 */
export async function markBillingEventFailed(
  database: DatabaseClient,
  input: BillingEventIdentity & {
    readonly errorCode?: string;
    readonly errorMessage?: string;
  },
): Promise<BillingEventRecord | null> {
  const rows = await database
    .update(billingEvent)
    .set({
      status: 'failed',
      errorCode: normalizeErrorCode(input.errorCode),
      errorMessage: normalizeErrorMessage(input.errorMessage),
      processedAt: null,
    })
    .where(
      and(
        eq(billingEvent.provider, input.provider),
        eq(billingEvent.providerEventId, input.providerEventId),
        inArray(billingEvent.status, ['received', 'failed']),
      ),
    )
    .returning();

  return rows[0] ?? null;
}

async function markTerminalBillingEvent(
  transaction: DatabaseTransaction,
  eventId: string,
  status: Extract<BillingEventStatus, 'processed' | 'ignored'>,
): Promise<BillingEventRecord> {
  const rows = await transaction
    .update(billingEvent)
    .set({
      status,
      errorCode: null,
      errorMessage: null,
      processedAt: new Date(),
    })
    .where(and(eq(billingEvent.id, eventId), eq(billingEvent.status, 'received')))
    .returning();
  const event = rows[0];

  if (event) {
    return event;
  }

  const existingRows = await transaction
    .select()
    .from(billingEvent)
    .where(eq(billingEvent.id, eventId))
    .limit(1);
  const existing = existingRows[0];

  if (existing?.status === status) {
    return existing;
  }

  throw new Error(`Billing event cannot transition to ${status}.`);
}

function normalizeErrorCode(value: string | undefined): string {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, '_')
    .slice(0, 100);

  return normalized || 'processing_failed';
}

function normalizeErrorMessage(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 500);

  return normalized || null;
}
