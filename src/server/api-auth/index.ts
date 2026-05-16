import type { Context } from 'hono';
import { ReforumApiError } from '../errors';
import { AuthedVariables } from '@/types';
import {
  hasPermission,
  hasRolePermission,
  type PermissionAction,
  type PermissionResource,
  type Role,
} from '@/server/lib/permissions';

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

export async function requirePermission<Resource extends PermissionResource>(
  c: Context<{ Variables: AuthedVariables }>,
  resource: Resource,
  action: PermissionAction<Resource>
) {
  const user = c.get('user');

  if (!user) {
    throw new ReforumApiError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  if (!(await hasRolePermission(user.role, resource, action))) {
    throw new ReforumApiError({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to perform this action',
    });
  }

  return user;
}

export async function requireActorPermission<Resource extends PermissionResource>(
  actor: { role: string } | null,
  resource: Resource,
  action: PermissionAction<Resource>
) {
  if (!actor) {
    throw new ReforumApiError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  if (!(await hasRolePermission(actor.role, resource, action))) {
    throw new ReforumApiError({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to perform this action',
    });
  }
}
