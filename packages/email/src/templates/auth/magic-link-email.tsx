import { Heading, Link, Text } from '@react-email/components';

import { EmailButton } from '#email/templates/components/email-button';
import { EmailFooter } from '#email/templates/components/email-footer';
import { EmailLayout } from '#email/templates/components/email-layout';
import { enMagicLinkMessages } from '#email/templates/messages/en';
import { zhCnMagicLinkMessages } from '#email/templates/messages/zh-CN';
import type { EmailLocale } from '#email/templates/template.types';

export type MagicLinkEmailProps = {
  readonly magicUrl: string;
  readonly expiresInMinutes: number;
  readonly locale: EmailLocale;
};

export function MagicLinkEmail({ magicUrl, expiresInMinutes, locale }: MagicLinkEmailProps) {
  const messages = locale === 'zh-CN' ? zhCnMagicLinkMessages : enMagicLinkMessages;

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
      <EmailButton href={magicUrl}>{messages.action}</EmailButton>
      <Text style={{ color: '#52525b', fontSize: '13px', lineHeight: '20px', marginTop: '24px' }}>
        {messages.expires(expiresInMinutes)}
      </Text>
      <Text style={{ color: '#52525b', fontSize: '13px', lineHeight: '20px' }}>
        {messages.ignore}
      </Text>
      <Text style={{ color: '#71717a', fontSize: '12px', lineHeight: '18px' }}>
        <Link href={magicUrl} style={{ color: '#52525b', wordBreak: 'break-all' }}>
          {magicUrl}
        </Link>
      </Text>
      <EmailFooter>{messages.footer}</EmailFooter>
    </EmailLayout>
  );
}
