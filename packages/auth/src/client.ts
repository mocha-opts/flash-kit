import { createAuthClient } from 'better-auth/react';

export const authClient: ReturnType<typeof createAuthClient> =
  createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [],
  });

export const { signIn, signUp, signOut, useSession } = authClient;
