import type { EmailTemplateDescriptor } from '#email/templates/template.types';

/** A validated email recipient with an optional display name. */
export type EmailAddress = {
  readonly email: string;
  readonly name?: string;
};

/** Public transport-neutral input for sending a rendered React Email descriptor. */
export type SendEmailInput = {
  readonly to: string | EmailAddress;
  readonly subject: string;
  readonly template: EmailTemplateDescriptor;
};

/** Provider-neutral send result; a provider may not return a message identifier. */
export type EmailSendResult = {
  readonly providerMessageId: string | null;
};

/** Private-provider input after recipient validation and template rendering. */
export type MailerMessage = {
  readonly to: EmailAddress;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
};

/** Server-only contract implemented identically by every supported mail provider. */
export type Mailer = {
  readonly sendEmail: (input: MailerMessage) => Promise<EmailSendResult>;
};
