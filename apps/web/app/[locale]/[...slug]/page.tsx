import { notFound } from 'next/navigation';

type LocaleCatchAllProps = {
  readonly params: Promise<{ locale: string; slug: string[] }>;
};

/** Keeps unknown paths inside the locale layout so its localized 404 can render. */
export default async function LocaleCatchAll({ params }: LocaleCatchAllProps): Promise<never> {
  await params;
  notFound();
}
