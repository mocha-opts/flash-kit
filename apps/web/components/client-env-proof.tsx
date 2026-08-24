'use client';

import { useState, type ReactNode } from 'react';

import { clientEnv } from '@repo/config/env/client';
import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/utils';

export function ClientEnvProof(): ReactNode {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="env-proof">
      <div>
        <p className="eyebrow">Browser-safe env import</p>
        <h2>{clientEnv.NEXT_PUBLIC_APP_NAME}</h2>
        <p>
          The browser bundle reads only the public client env whitelist from
          <code>@repo/config/env/client</code>.
        </p>
      </div>

      <dl className={cn('env-list', isExpanded && 'env-list-expanded')}>
        <div>
          <dt>Public URL</dt>
          <dd>{clientEnv.NEXT_PUBLIC_SITE_URL}</dd>
        </div>
        {isExpanded ? (
          <div>
            <dt>Secret access</dt>
            <dd>Not exposed</dd>
          </div>
        ) : null}
      </dl>

      <Button
        aria-expanded={isExpanded}
        className="secondary-button"
        onClick={() => setIsExpanded((value) => !value)}
        variant="secondary"
      >
        {isExpanded ? 'Hide proof' : 'Show proof'}
      </Button>
    </div>
  );
}
