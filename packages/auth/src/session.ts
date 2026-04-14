import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';

import { auth } from './server';
import { db } from '@flash-kit/database/client';
import {
  memberships,
  organizations,
  subscriptions,
} from '@flash-kit/database/schema';

export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
});

export const getCurrentSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session ?? null;
});

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return user;
}

export async function getOrgContext(orgSlug: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return null;

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, user.id),
      eq(memberships.orgId, org.id),
    ),
  });
  if (!membership) return null;

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.orgId, org.id),
  }) ?? null;

  return { user, org, membership, subscription };
}
