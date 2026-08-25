import type { ReactNode } from 'react';

/** Stable semantic kinds understood by the email template boundary. */
export type EmailTemplateKind =
  | 'magic-link'
  | 'email-change-notice'
  | 'welcome'
  | 'purchase-receipt'
  | 'payment-failed'
  | 'custom';

export type EmailLocale = 'en' | 'zh-CN';

/** Environment-neutral React Email descriptor used by previews and the server renderer. */
export type EmailTemplateDescriptor = {
  readonly kind: EmailTemplateKind;
  readonly previewText: string;
  readonly body: ReactNode;
};
