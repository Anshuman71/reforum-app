import type { Context } from 'hono';
import { ReforumApiError } from '../errors';
import { AuthedVariables } from '@/types';

type Role = 'user' | 'moderator' | 'admin';

const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

/**
 * Check if the current user is authenticated and optionally has the required role.
 * Roles are hierarchical: admin > moderator > user.
 */
export function isAuthorized(
  c: Context<{ Variables: AuthedVariables }>,
  requiredRole?: Role
) {
  const user = c.get('user');

  if (!user) {
    throw new ReforumApiError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  if (requiredRole) {
    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole];

    if (userLevel < requiredLevel) {
      throw new ReforumApiError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to perform this action',
      });
    }
  }
}
