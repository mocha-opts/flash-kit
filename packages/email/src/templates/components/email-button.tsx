import { Button } from '@react-email/components';

type EmailButtonProps = {
  readonly href: string;
  readonly children: string;
};

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: '#18181b',
        borderRadius: '8px',
        color: '#ffffff',
        display: 'inline-block',
        fontSize: '15px',
        fontWeight: '600',
        lineHeight: '20px',
        padding: '12px 20px',
        textDecoration: 'none',
      }}
    >
      {children}
    </Button>
  );
}
