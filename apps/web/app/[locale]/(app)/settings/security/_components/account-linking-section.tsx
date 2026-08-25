'use client';

import { linkSocialAccount, type OAuthProvider, unlinkAccount } from '@repo/auth/client';
import { useRouter } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import { useState } from 'react';

type LinkedAccount = {
  readonly id: string;
  readonly canUnlink: boolean;
  readonly linkedLabel: string;
  readonly unlinkLabel: string;
};

export type AccountLinkingProviderView = {
  readonly provider: OAuthProvider;
  readonly label: string;
  readonly linkLabel: string;
  readonly linkingLabel: string;
  readonly accounts: readonly LinkedAccount[];
};

export type AccountLinkingLabels = {
  readonly sectionTitle: string;
  readonly sectionDescription: string;
  readonly link: string;
  readonly unlink: string;
  readonly linking: string;
  readonly unlinking: string;
  readonly lastAccount: string;
  readonly requestFailed: string;
};

type AccountLinkingSectionProps = {
  readonly callbackPath: string;
  readonly initialError?: boolean;
  readonly labels: AccountLinkingLabels;
  readonly providerViews: readonly AccountLinkingProviderView[];
};

/** Client interaction leaf for Better Auth's explicit link and unlink endpoints. */
export function AccountLinkingSection({
  callbackPath,
  initialError = false,
  labels,
  providerViews,
}: AccountLinkingSectionProps) {
  const router = useRouter();
  const [requestFailed, setRequestFailed] = useState(initialError);
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);

  const startLink = async (provider: OAuthProvider) => {
    setRequestFailed(false);
    setPendingProvider(provider);

    try {
      const result = await linkSocialAccount({
        provider,
        callbackPath,
        errorCallbackPath: callbackPath,
      });

      if (result.error) {
        setRequestFailed(true);
        setPendingProvider(null);
      }
    } catch {
      setRequestFailed(true);
      setPendingProvider(null);
    }
  };

  const startUnlink = async (account: LinkedAccount) => {
    if (!account.canUnlink) {
      return;
    }

    setRequestFailed(false);
    setPendingAccountId(account.id);

    try {
      const result = await unlinkAccount(account.id);

      if (result.error) {
        setRequestFailed(true);
        return;
      }

      router.refresh();
    } catch {
      setRequestFailed(true);
    } finally {
      setPendingAccountId(null);
    }
  };

  return (
    <section className="mt-12 border-y border-border py-8 sm:mt-16 sm:py-10">
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">{labels.sectionTitle}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        {labels.sectionDescription}
      </p>

      {requestFailed ? (
        <p className="mt-5 text-sm text-destructive" role="alert">
          {labels.requestFailed}
        </p>
      ) : null}

      <div className="mt-8 grid gap-3">
        {providerViews.map(({ accounts, label, linkLabel, linkingLabel, provider }) => {
          const pending = pendingProvider === provider;

          return (
            <div className="flex flex-col gap-4 border border-border p-4" key={provider}>
              <p className="font-medium">{label}</p>

              {accounts.length > 0 ? (
                <div className="grid gap-3">
                  {accounts.map((account) => (
                    <div
                      className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between"
                      key={account.id}
                    >
                      <p className="text-sm text-muted-foreground">{account.linkedLabel}</p>
                      <div className="grid gap-2 sm:justify-items-end">
                        <button
                          aria-label={account.unlinkLabel}
                          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                          disabled={
                            !account.canUnlink ||
                            pendingAccountId !== null ||
                            pendingProvider !== null
                          }
                          onClick={() => void startUnlink(account)}
                          title={!account.canUnlink ? labels.lastAccount : undefined}
                          type="button"
                        >
                          {pendingAccountId === account.id ? labels.unlinking : labels.unlink}
                        </button>
                        {!account.canUnlink ? (
                          <p className="max-w-xs text-right text-xs text-muted-foreground">
                            {labels.lastAccount}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  aria-label={pending ? linkingLabel : linkLabel}
                  className={buttonVariants({ size: 'sm' })}
                  disabled={pendingAccountId !== null || pendingProvider !== null}
                  onClick={() => void startLink(provider)}
                  type="button"
                >
                  {pending ? labels.linking : labels.link}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
