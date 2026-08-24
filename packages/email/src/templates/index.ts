import type { ReactNode } from 'react';

/** Stable semantic kinds understood by the email template boundary. */
export type EmailTemplateKind =
  | 'magic-link'
  | 'email-change-notice'
  | 'welcome'
  | 'purchase-receipt'
  | 'payment-failed'
  | 'custom';

/** Environment-neutral template descriptor; provider rendering is outside this package boundary. */
export type EmailTemplateDescriptor = {
  readonly kind: EmailTemplateKind;
  readonly previewText: string;
  readonly body?: ReactNode;
};
