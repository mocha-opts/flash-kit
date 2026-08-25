import 'server-only';

import { Resend } from 'resend';

import type { EmailConfig } from '#email/config/index';
import { formatRecipient } from '#email/internal/normalize-recipient';
import type { EmailSendResult, Mailer, MailerMessage } from '#email/mailer/mailer.types';

type ResendEmailConfig = Extract<EmailConfig, { provider: 'resend' }>;

export class ResendMailer implements Mailer {
  readonly #client: Resend;
  readonly #from: string;

  constructor(config: ResendEmailConfig) {
    this.#client = new Resend(config.apiKey);
    this.#from = config.from;
  }

  async sendEmail(input: MailerMessage): Promise<EmailSendResult> {
    const response = await this.#client.emails.send({
      from: this.#from,
      to: formatRecipient(input.to),
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (response.error || !response.data) {
      throw new Error('Resend rejected the email delivery request.');
    }

    return { providerMessageId: response.data.id };
  }
}
