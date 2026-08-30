import 'server-only';

export { auth } from '#auth';
export { ForbiddenError, UnauthenticatedError } from '#internal/auth-errors';
export { DEFAULT_AUTH_CALLBACK_PATH, getSafeCallbackPath } from '#internal/safe-callback-path';
export {
  deleteCurrentUserAccount,
  SessionNotFreshError,
} from './account-deletion';
export {
  getLinkedAccountSummaries,
  type LinkedAccountSummary,
} from './account-linking';
export {
  banAdminUser,
  revokeAdminUserSessions,
  unbanAdminUser,
} from './admin-users';
export { type RequestEmailChangeInput, requestEmailChange } from './email-change';
export { type AuthSession, type AuthUser, getSession } from './get-session';
export { getUser } from './get-user';
export {
  type CurrentProfile,
  getCurrentProfile,
  listCurrentSessions,
  revokeCurrentOtherSessions,
  revokeCurrentSession,
  type SessionView,
  updateCurrentDisplayName,
} from './profile-security';
export { requireAdmin } from './require-admin';
export { requireUser } from './require-user';
export { revokeOtherSessions, revokeSession } from './session-management';
