import 'server-only';

import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

import type { EmailConfig } from '#email/config/index';
import { formatRecipient } from '#email/internal/normalize-recipient';
import type { EmailSendResult, Mailer, MailerMessage } from '#email/mailer/mailer.types';

type SmtpEmailConfig = Extract<EmailConfig, { provider: 'smtp' }>;

export class SmtpMailer implements Mailer {
  readonly #from: string;
  readonly #transporter: Transporter;

  constructor(config: SmtpEmailConfig) {
    this.#from = config.from;
    this.#transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      ...(config.auth ? { auth: config.auth } : {}),
    });
  }

  async sendEmail(input: MailerMessage): Promise<EmailSendResult> {
    const response = await this.#transporter.sendMail({
      from: this.#from,
      to: formatRecipient(input.to),
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    return { providerMessageId: response.messageId || null };
  }
}
