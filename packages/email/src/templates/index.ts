import type { ReactNode } from 'react';

export type EmailTemplateKind =
  | 'magic-link'
  | 'email-change-notice'
  | 'welcome'
  | 'purchase-receipt'
  | 'payment-failed'
  | 'custom';

export type EmailTemplateDescriptor = {
  readonly kind: EmailTemplateKind;
  readonly previewText: string;
  readonly body?: ReactNode;
};
