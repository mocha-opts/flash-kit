import { Body, Container, Head, Html, Preview, Section } from '@react-email/components';
import type { ReactNode } from 'react';

type EmailLayoutProps = {
  readonly preview: string;
  readonly children: ReactNode;
};

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: '#f4f4f5',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          margin: 0,
          padding: '32px 12px',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            margin: '0 auto',
            maxWidth: '560px',
          }}
        >
          <Section style={{ padding: '36px' }}>{children}</Section>
        </Container>
      </Body>
    </Html>
  );
}
