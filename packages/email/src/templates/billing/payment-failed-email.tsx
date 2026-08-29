import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailFooter } from '#email/templates/components/email-footer';
import { EmailLayout } from '#email/templates/components/email-layout';
import { enBillingMessages } from '#email/templates/messages/en';
import { zhCnBillingMessages } from '#email/templates/messages/zh-CN';
import type { EmailLocale } from '#email/templates/template.types';
import { formatBillingCurrency, formatBillingDate } from './billing-formatters';
import type { BillingInterval } from './purchase-receipt-email';

export type PaymentFailedEmailProps = {
  readonly locale: EmailLocale;
  readonly interval: BillingInterval;
  /** Provider amount in the smallest currency unit, when available. */
  readonly amount?: number;
  readonly currency?: string;
  readonly occurredAt: Date;
};

export function PaymentFailedEmail({
  locale,
  interval,
  amount,
  currency,
  occurredAt,
}: PaymentFailedEmailProps) {
  const messages =
    locale === 'zh-CN' ? zhCnBillingMessages.paymentFailed : enBillingMessages.paymentFailed;
  const itemName = getPaymentName(locale, interval);
  const hasAmount = amount !== undefined && currency !== undefined;

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
          {itemName}
        </Text>
        {hasAmount ? (
          <>
            <Text
              style={{
                color: '#71717a',
                fontSize: '12px',
                lineHeight: '18px',
                margin: '0 0 4px',
              }}
            >
              {messages.amount}
            </Text>
            <Text
              style={{
                color: '#18181b',
                fontSize: '16px',
                lineHeight: '24px',
                margin: '0 0 18px',
              }}
            >
              {formatBillingCurrency(amount, currency, locale)}
            </Text>
          </>
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

function getPaymentName(locale: EmailLocale, interval: BillingInterval): string {
  if (locale === 'zh-CN') {
    return interval === 'year' ? '年度订阅' : '月度订阅';
  }

  return interval === 'year' ? 'Yearly subscription' : 'Monthly subscription';
}
