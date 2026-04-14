export { auth } from './server';
export type { Auth } from './server';

export {
  authClient,
  signIn,
  signUp,
  signOut,
  useSession,
} from './client';

export {
  getCurrentUser,
  getCurrentSession,
  requireAuth,
  getOrgContext,
  getProxySession,
  isSuperAdmin,
} from './session';

export {
  requireOrgRole,
  requireSuperAdmin,
  AuthError,
} from './guards';

export type { OrgRole } from './guards';
