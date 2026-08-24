import 'server-only';

export type AuthUser = {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly isAdmin: boolean;
};

export type AuthSession = {
  readonly id: string;
  readonly user: AuthUser;
  readonly expiresAt: Date;
};

export type AuthRuntimeBoundary = {
  readonly provider: 'better-auth';
};

export async function getSession(): Promise<AuthSession | null> {
  throw new Error('Better Auth server runtime is implemented after the T01 boundary scaffold.');
}

export async function getUser(): Promise<AuthUser | null> {
  throw new Error('Better Auth server runtime is implemented after the T01 boundary scaffold.');
}

export async function requireUser(): Promise<never> {
  throw new Error('Better Auth server runtime is implemented after the T01 boundary scaffold.');
}

export async function requireAdmin(): Promise<never> {
  throw new Error('Better Auth admin runtime is implemented after the T01 boundary scaffold.');
}

export async function revokeSession(): Promise<never> {
  throw new Error('Session revocation is implemented after the T01 boundary scaffold.');
}

export async function revokeOtherSessions(): Promise<never> {
  throw new Error('Session revocation is implemented after the T01 boundary scaffold.');
}
