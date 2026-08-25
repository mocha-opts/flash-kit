import { render, toPlainText } from '@react-email/components';
import type { ReactNode } from 'react';

type RenderedEmail = {
  readonly html: string;
  readonly text: string;
};

export async function renderEmail(body: ReactNode): Promise<RenderedEmail> {
  const html = await render(body);

  return {
    html,
    text: toPlainText(html),
  };
}
