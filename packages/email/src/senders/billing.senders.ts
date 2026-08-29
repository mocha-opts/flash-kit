import 'server-only';

import { createElement } from 'react';
import { z } from 'zod';

import { sendEmail } from '#email/mailer/send-email';
import { PaymentFailedEmail } from '#email/templates/billing/payment-failed-email';
import {
  type BillingInterval,
  PurchaseReceiptEmail,
} from '#email/templates/billing/purchase-receipt-email';
import { enBillingMessages } from '#email/templates/messages/en';
import { zhCnBillingMessages } from '#email/templates/messages/zh-CN';
import type { EmailLocale } from '#email/templates/template.types';

const emailSchema = z.string().email();
const nameSchema = z.string().trim().min(1).max(120).optional();
const localeSchema = z.enum(['en', 'zh-CN']).default('en');
const purchaseKindSchema = z.enum(['subscription', 'lifetime', 'credit-package']);
const intervalSchema = z.enum(['month', 'year']);
const amountSchema = z.number().int().nonnegative().safe();
const currencySchema = z
  .string()
  .regex(/^[a-z]{3}$/iu)
  .transform((value) => value.toLowerCase());
const occurredAtSchema = z.coerce.date();

const purchaseReceiptInputSchema = z
  .object({
    email: emailSchema,
    name: nameSchema,
    locale: localeSchema,
    purchaseKind: purchaseKindSchema,
    interval: intervalSchema.optional(),
    amount: amountSchema,
    currency: currencySchema,
    credits: z.number().int().positive().safe().optional(),
    occurredAt: occurredAtSchema.default(() => new Date()),
  })
  .superRefine((input, context) => {
    if (input.purchaseKind === 'subscription' && input.interval === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['interval'],
        message: 'Subscription receipts require a billing interval.',
      });
    }

    if (input.purchaseKind !== 'subscription' && input.interval !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['interval'],
        message: 'Only subscription receipts accept a billing interval.',
      });
    }

    if (input.purchaseKind === 'credit-package' && input.credits === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['credits'],
        message: 'Credit Pack receipts require a credit amount.',
      });
    }

    if (input.purchaseKind !== 'credit-package' && input.credits !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['credits'],
        message: 'Only Credit Pack receipts accept a credit amount.',
      });
    }
  });

const paymentFailedInputSchema = z
  .object({
    email: emailSchema,
    name: nameSchema,
    locale: localeSchema,
    interval: intervalSchema,
    amount: amountSchema.optional(),
    currency: currencySchema.optional(),
    occurredAt: occurredAtSchema.default(() => new Date()),
  })
  .superRefine((input, context) => {
    if ((input.amount === undefined) !== (input.currency === undefined)) {
      context.addIssue({
        code: 'custom',
        path: [input.amount === undefined ? 'amount' : 'currency'],
        message: 'Payment amount and currency must be provided together.',
      });
    }
  });

type SendPurchaseReceiptEmailInputBase = {
  readonly email: string;
  readonly name?: string;
  readonly locale?: EmailLocale;
  /** Provider amount in the smallest currency unit. */
  readonly amount: number;
  /** Lowercase or uppercase ISO 4217 currency code. */
  readonly currency: string;
  readonly occurredAt?: Date | string;
};

export type SendPurchaseReceiptEmailInput =
  | (SendPurchaseReceiptEmailInputBase & {
      readonly purchaseKind: 'subscription';
      readonly interval: BillingInterval;
      readonly credits?: never;
    })
  | (SendPurchaseReceiptEmailInputBase & {
      readonly purchaseKind: 'lifetime';
      readonly interval?: never;
      readonly credits?: never;
    })
  | (SendPurchaseReceiptEmailInputBase & {
      readonly purchaseKind: 'credit-package';
      readonly interval?: never;
      readonly credits: number;
    });

export type SendPaymentFailedEmailInput = {
  readonly email: string;
  readonly name?: string;
  readonly locale?: EmailLocale;
  readonly interval: BillingInterval;
  /** Provider amount in the smallest currency unit, when available. */
  readonly amount?: number;
  /** ISO 4217 currency code, required when `amount` is provided. */
  readonly currency?: string;
  readonly occurredAt?: Date | string;
};

/** Deliberately omits provider response data from the auxiliary sender result. */
export type BillingEmailSendResult = { readonly status: 'sent' } | { readonly status: 'failed' };

/**
 * Sends a localized purchase receipt. Input validation still throws, while
 * rendering and delivery failures are reduced to a safe result so committed
 * billing facts remain authoritative.
 */
export async function sendPurchaseReceiptEmail(
  input: SendPurchaseReceiptEmailInput,
): Promise<BillingEmailSendResult> {
  const parsed = purchaseReceiptInputSchema.parse(input);
  const messages =
    parsed.locale === 'zh-CN'
      ? zhCnBillingMessages.purchaseReceipt
      : enBillingMessages.purchaseReceipt;

  try {
    await sendEmail({
      to: parsed.name ? { email: parsed.email, name: parsed.name } : parsed.email,
      subject: messages.subject,
      template: {
        kind: 'purchase-receipt',
        previewText: messages.preview,
        body: createElement(PurchaseReceiptEmail, {
          locale: parsed.locale,
          purchaseKind: parsed.purchaseKind,
          ...(parsed.interval ? { interval: parsed.interval } : {}),
          amount: parsed.amount,
          currency: parsed.currency,
          ...(parsed.credits !== undefined ? { credits: parsed.credits } : {}),
          occurredAt: parsed.occurredAt,
        }),
      },
    });

    return { status: 'sent' };
  } catch {
    logBillingEmailFailure('purchase_receipt');
    return { status: 'failed' };
  }
}

/**
 * Sends a localized payment failure notice. Delivery and rendering failures
 * are intentionally not rethrown after the billing event has been committed.
 */
export async function sendPaymentFailedEmail(
  input: SendPaymentFailedEmailInput,
): Promise<BillingEmailSendResult> {
  const parsed = paymentFailedInputSchema.parse(input);
  const messages =
    parsed.locale === 'zh-CN' ? zhCnBillingMessages.paymentFailed : enBillingMessages.paymentFailed;

  try {
    await sendEmail({
      to: parsed.name ? { email: parsed.email, name: parsed.name } : parsed.email,
      subject: messages.subject,
      template: {
        kind: 'payment-failed',
        previewText: messages.preview,
        body: createElement(PaymentFailedEmail, {
          locale: parsed.locale,
          interval: parsed.interval,
          ...(parsed.amount !== undefined ? { amount: parsed.amount } : {}),
          ...(parsed.currency ? { currency: parsed.currency } : {}),
          occurredAt: parsed.occurredAt,
        }),
      },
    });

    return { status: 'sent' };
  } catch {
    logBillingEmailFailure('payment_failed');
    return { status: 'failed' };
  }
}

function logBillingEmailFailure(kind: 'purchase_receipt' | 'payment_failed'): void {
  console.error('Auxiliary billing email delivery failed.', {
    category: 'auxiliary_billing_email_failure',
    kind,
  });
}
