'use client';

/** Client-only auth boundary marker; it carries no server session or secret data. */
export type AuthClientBoundary = {
  readonly provider: 'better-auth';
  readonly status: 'not-implemented-in-t01';
};
