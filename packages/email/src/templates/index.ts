export {
  EmailChangeNoticeEmail,
  type EmailChangeNoticeEmailProps,
} from './auth/email-change-notice-email';
export {
  EmailChangeVerificationEmail,
  type EmailChangeVerificationEmailProps,
} from './auth/email-change-verification-email';
export { MagicLinkEmail, type MagicLinkEmailProps } from './auth/magic-link-email';
export { PaymentFailedEmail, type PaymentFailedEmailProps } from './billing/payment-failed-email';
export {
  type BillingInterval,
  type BillingPurchaseKind,
  PurchaseReceiptEmail,
  type PurchaseReceiptEmailProps,
} from './billing/purchase-receipt-email';
export type { EmailLocale, EmailTemplateDescriptor, EmailTemplateKind } from './template.types';
