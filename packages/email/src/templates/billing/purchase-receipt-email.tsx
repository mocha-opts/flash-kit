import { Heading, Hr, Section, Text } from '@react-email/components';

import { EmailFooter } from '#email/templates/components/email-footer';
import { EmailLayout } from '#email/templates/components/email-layout';
import { enBillingMessages } from '#email/templates/messages/en';
import { zhCnBillingMessages } from '#email/templates/messages/zh-CN';
import type { EmailLocale } from '#email/templates/template.types';
import { formatBillingCurrency, formatBillingDate } from './billing-formatters';

export type BillingPurchaseKind = 'subscription' | 'lifetime' | 'credit-package';

export type BillingInterval = 'month' | 'year';

export type PurchaseReceiptEmailProps = {
  readonly locale: EmailLocale;
  readonly purchaseKind: BillingPurchaseKind;
  readonly interval?: BillingInterval;
  /** Provider amount in the smallest currency unit. */
  readonly amount: number;
  readonly currency: string;
  readonly credits?: number;
  readonly occurredAt: Date;
};

export function PurchaseReceiptEmail({
  locale,
  purchaseKind,
  interval,
  amount,
  currency,
  credits,
  occurredAt,
}: PurchaseReceiptEmailProps) {
  const messages =
    locale === 'zh-CN' ? zhCnBillingMessages.purchaseReceipt : enBillingMessages.purchaseReceipt;
  const purchaseName = getPurchaseName(messages, purchaseKind, interval);

  return (
    <EmailLayout preview={messages.preview}>
      <Heading
        style={{ color: '#18181b', fontSize: '24px', lineHeight: '32px', margin: '0 0 20px' }}
      >
        {messages.heading}
      </Heading>
      <Text style={{ color: '#3f3f46', fontSize: '15px', lineHeight: '24px' }}>
        {messages.intro}
      </Text>
      <Hr style={{ borderColor: '#e4e4e7', margin: '24px 0' }} />
      <Section>
        <Text style={{ color: '#71717a', fontSize: '12px', lineHeight: '18px', margin: '0 0 4px' }}>
          {messages.item}
        </Text>
        <Text
          style={{ color: '#18181b', fontSize: '16px', lineHeight: '24px', margin: '0 0 18px' }}
        >
          {purchaseName}
        </Text>
        <Text style={{ color: '#71717a', fontSize: '12px', lineHeight: '18px', margin: '0 0 4px' }}>
          {messages.amount}
        </Text>
        <Text
          style={{ color: '#18181b', fontSize: '16px', lineHeight: '24px', margin: '0 0 18px' }}
        >
          {formatBillingCurrency(amount, currency, locale)}
        </Text>
        {credits !== undefined ? (
          <Text
            style={{
              color: '#3f3f46',
              fontSize: '15px',
              lineHeight: '24px',
              margin: '0 0 18px',
            }}
          >
            {messages.credits(credits)}
          </Text>
        ) : null}
        <Text style={{ color: '#71717a', fontSize: '12px', lineHeight: '18px', margin: '0 0 4px' }}>
          {messages.date}
        </Text>
        <Text style={{ color: '#3f3f46', fontSize: '15px', lineHeight: '24px', margin: 0 }}>
          {formatBillingDate(occurredAt, locale)}
        </Text>
      </Section>
      <EmailFooter>{messages.footer}</EmailFooter>
    </EmailLayout>
  );
}

type PurchaseMessages = {
  readonly itemName: {
    readonly subscription: (interval: BillingInterval | undefined) => string;
    readonly lifetime: string;
    readonly 'credit-package': string;
  };
};

function getPurchaseName(
  messages: PurchaseMessages,
  purchaseKind: BillingPurchaseKind,
  interval: BillingInterval | undefined,
): string {
  if (purchaseKind === 'subscription') {
    return messages.itemName.subscription(interval);
  }

  return messages.itemName[purchaseKind];
}
