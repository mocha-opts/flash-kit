import { Heading, Text } from '@react-email/components';

import { EmailFooter } from '#email/templates/components/email-footer';
import { EmailLayout } from '#email/templates/components/email-layout';
import { enEmailChangeMessages } from '#email/templates/messages/en';
import { zhCnEmailChangeMessages } from '#email/templates/messages/zh-CN';
import type { EmailLocale } from '#email/templates/template.types';

export type EmailChangeNoticeEmailProps = {
  readonly newEmail: string;
  readonly locale: EmailLocale;
};

export function EmailChangeNoticeEmail({ newEmail, locale }: EmailChangeNoticeEmailProps) {
  const messages =
    locale === 'zh-CN' ? zhCnEmailChangeMessages.notice : enEmailChangeMessages.notice;

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
      <Text
        style={{
          backgroundColor: '#f4f4f5',
          borderRadius: '8px',
          color: '#18181b',
          fontSize: '15px',
          lineHeight: '24px',
          margin: '20px 0',
          padding: '12px 16px',
        }}
      >
        {newEmail}
      </Text>
      <Text style={{ color: '#52525b', fontSize: '13px', lineHeight: '20px' }}>
        {messages.reminder}
      </Text>
      <Text style={{ color: '#52525b', fontSize: '13px', lineHeight: '20px' }}>
        {messages.ignore}
      </Text>
      <EmailFooter>{messages.footer}</EmailFooter>
    </EmailLayout>
  );
}
