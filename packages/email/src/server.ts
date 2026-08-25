import 'server-only';

export type {
  EmailAddress,
  EmailSendResult,
  Mailer,
  SendEmailInput,
} from '#email/mailer/index';
export { sendEmail } from '#email/mailer/index';
export {
  type SendEmailChangeNoticeInput,
  type SendEmailChangeVerificationEmailInput,
  type SendMagicLinkEmailInput,
  sendEmailChangeNotice,
  sendEmailChangeVerificationEmail,
  sendMagicLinkEmail,
} from '#email/senders/auth.senders';
export { sendPaymentFailedEmail, sendPurchaseReceiptEmail } from '#email/senders/billing.senders';
export { sendWelcomeEmail } from '#email/senders/product.senders';
