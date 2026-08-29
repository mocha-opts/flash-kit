import type { EmailLocale } from '#email/templates/template.types';

export function formatBillingCurrency(
  amount: number,
  currency: string,
  locale: EmailLocale,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;

  return formatter.format(amount / 10 ** fractionDigits);
}

export function formatBillingDate(value: Date, locale: EmailLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(value);
}
