import 'server-only';

/** Server-visible identity data; secrets and provider tokens are intentionally absent. */
export type AuthUser = {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly isAdmin: boolean;
};

/** An authenticated user session with its provider-issued expiry time. */
export type AuthSession = {
  readonly id: string;
  readonly user: AuthUser;
  readonly expiresAt: Date;
};

/** Identifies the server auth provider without exposing its runtime implementation. */
export type AuthRuntimeBoundary = {
  readonly provider: 'better-auth';
};

/**
 * Gets the current session without redirecting; the caller decides how an absent session is handled.
 *
 * @throws {Error} Always in T01 because the Better Auth runtime is not configured.
 */
export async function getSession(): Promise<AuthSession | null> {
  throw new Error('T01-not-configured: Better Auth server runtime is not configured.');
}

/**
 * Gets the current user without redirecting.
 *
 * @throws {Error} Always in T01 because the Better Auth runtime is not configured.
 */
export async function getUser(): Promise<AuthUser | null> {
  throw new Error('T01-not-configured: Better Auth server runtime is not configured.');
}

/**
 * Placeholder for a required-user check; redirects and error conversion belong to the caller.
 *
 * @throws {Error} Always in T01 because the Better Auth runtime is not configured.
 */
export async function requireUser(): Promise<never> {
  throw new Error('T01-not-configured: Better Auth server runtime is not configured.');
}

/**
 * Placeholder for a required-admin check; authorization must remain server-only.
 *
 * @throws {Error} Always in T01 because the Better Auth runtime is not configured.
 */
export async function requireAdmin(): Promise<never> {
  throw new Error('T01-not-configured: Better Auth admin runtime is not configured.');
}

/**
 * Placeholder for revoking the current session.
 *
 * @throws {Error} Always in T01 because the Better Auth runtime is not configured.
 */
export async function revokeSession(): Promise<never> {
  throw new Error('T01-not-configured: session revocation is not configured.');
}

/**
 * Placeholder for revoking every other session for the current user.
 *
 * @throws {Error} Always in T01 because the Better Auth runtime is not configured.
 */
export async function revokeOtherSessions(): Promise<never> {
  throw new Error('T01-not-configured: session revocation is not configured.');
}
