'use client';

import { Link } from '@repo/i18n/navigation';
import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/dialog';
import { useMobileNavigationStore } from '@/lib/stores/mobile-navigation.store';

type MobileNavigationLink = {
  readonly href: string;
  readonly label: string;
};

export type MobileNavigationProps = {
  readonly closeLabel: string;
  readonly description: string;
  readonly links: readonly MobileNavigationLink[];
  readonly locale: 'en' | 'zh-CN';
  readonly menuLabel: string;
  readonly openLabel: string;
};

export type MobileNavigationTriggerProps = {
  readonly openLabel: string;
};

export type MobileNavigationPanelProps = Omit<MobileNavigationProps, 'openLabel'>;

/** Mobile navigation uses the shared Radix Dialog and one ephemeral Zustand flag. */
export function MobileNavigation({
  closeLabel,
  description,
  links,
  locale,
  menuLabel,
  openLabel,
}: MobileNavigationProps) {
  const mobileNavigationOpen = useMobileNavigationStore((state) => state.mobileNavigationOpen);
  const setMobileNavigationOpen = useMobileNavigationStore(
    (state) => state.setMobileNavigationOpen,
  );

  return (
    <Dialog open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
      <MobileNavigationTrigger openLabel={openLabel} />
      <MobileNavigationPanel
        closeLabel={closeLabel}
        description={description}
        links={links}
        locale={locale}
        menuLabel={menuLabel}
      />
    </Dialog>
  );
}

function MobileNavigationTrigger({ openLabel }: MobileNavigationTriggerProps) {
  return (
    <DialogTrigger asChild>
      <Button aria-label={openLabel} className="size-9 p-0 md:hidden" size="icon" variant="ghost">
        <span aria-hidden="true" className="flex w-4 flex-col gap-1">
          <span className="h-px w-full bg-current" />
          <span className="h-px w-full bg-current" />
          <span className="h-px w-full bg-current" />
        </span>
      </Button>
    </DialogTrigger>
  );
}

function MobileNavigationPanel({
  closeLabel,
  description,
  links,
  locale,
  menuLabel,
}: MobileNavigationPanelProps) {
  const setMobileNavigationOpen = useMobileNavigationStore(
    (state) => state.setMobileNavigationOpen,
  );

  return (
    <DialogContent closeLabel={closeLabel} className="max-w-md p-7 sm:p-8">
      <DialogHeader className="pr-8">
        <DialogTitle>{menuLabel}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <nav aria-label={menuLabel} className="grid gap-1 pt-2">
        {links.map((link) => (
          <Link
            key={link.href}
            className="rounded-md border-b border-border px-1 py-4 text-base font-medium outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            href={link.href}
            locale={locale}
            onClick={() => setMobileNavigationOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </DialogContent>
  );
}
