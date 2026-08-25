import { Hr, Text } from '@react-email/components';

type EmailFooterProps = {
  readonly children: string;
};

export function EmailFooter({ children }: EmailFooterProps) {
  return (
    <>
      <Hr style={{ borderColor: '#e4e4e7', margin: '28px 0 20px' }} />
      <Text style={{ color: '#71717a', fontSize: '12px', lineHeight: '18px', margin: 0 }}>
        {children}
      </Text>
    </>
  );
}
