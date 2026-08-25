import { auth } from '@repo/auth/server';
import { toNextJsHandler } from 'better-auth/next-js';

/** The single Better Auth transport boundary for the web application. */
export const { GET, POST } = toNextJsHandler(auth);
