import 'server-only';

import { admin, createAccessControl } from 'better-auth/plugins';

const adminStatements = {
  user: ['create', 'list', 'set-role', 'ban', 'delete', 'get', 'update'],
  session: ['list', 'revoke', 'delete'],
} as const;

const accessControl = createAccessControl(adminStatements);
const roles = {
  admin: accessControl.newRole(adminStatements),
  user: accessControl.newRole({ user: [], session: [] }),
};

/** Admin fields and revocation APIs without impersonation permission. */
export const adminPlugin = admin({
  ac: accessControl,
  roles,
  defaultRole: 'user',
  adminRoles: ['admin'],
  allowImpersonatingAdmins: false,
});
