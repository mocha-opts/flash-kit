import 'server-only';

export { auth } from '#auth';
export { ForbiddenError, UnauthenticatedError } from '#internal/auth-errors';
export { DEFAULT_AUTH_CALLBACK_PATH, getSafeCallbackPath } from '#internal/safe-callback-path';

export { type AuthSession, type AuthUser, getSession } from './get-session';
export { getUser } from './get-user';
export { requireAdmin } from './require-admin';
export { requireUser } from './require-user';
export { revokeOtherSessions, revokeSession } from './session-management';
export {
  getLinkedAccountSummaries,
  type LinkedAccountSummary,
} from './account-linking';
