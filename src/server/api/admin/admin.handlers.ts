import type { AppRouteHandler } from '@/types';
import { db } from '@/server/db';
import {
  categoryGroups,
  groups,
  rolePermissions,
  roles,
  userGroups,
  users,
} from '@/server/db/schema';
import { count, eq, ilike, inArray, or } from 'drizzle-orm';
import { requirePermission } from '@/server/api-auth';
import {
  getAvailablePermissions,
  getDefaultRolePermissions,
  isValidPermission,
  roleExists,
  statement,
  type PermissionResource,
} from '@/server/lib/permissions';
import { isRole } from '@/lib/roles';
import { newId } from '@/server/lib/id';
import { ReforumApiError } from '@/server/errors';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type {
  CreateRoleRoute,
  CreateGroupRoute,
  DeleteGroupRoute,
  DeleteRoleRoute,
  ListGroupsRoute,
  ListPermissionsRoute,
  ListRolesRoute,
  UpdateGroupRoute,
  ListUsersRoute,
  UpdateRoleRoute,
  UpdateUserRoleRoute,
} from './admin.routes';

type RolePermissionInput = {
  resource: string;
  action: string;
};

function badRequest(message: string): never {
  throw new ReforumApiError({
    code: 'BAD_REQUEST',
    message,
  });
}

function forbidden(message: string): never {
  throw new ReforumApiError({
    code: 'FORBIDDEN',
    message,
  });
}

function notFound(message: string): never {
  throw new ReforumApiError({
    code: 'NOT_FOUND',
    message,
  });
}

function normalizePermissions(input: RolePermissionInput[]) {
  const seen = new Set<string>();

  return input.flatMap((permission) => {
    const resource = permission.resource as PermissionResource;

    if (!(resource in statement) || !isValidPermission(resource, permission.action)) {
      badRequest(`Unknown permission: ${permission.resource}:${permission.action}`);
    }

    const key = `${resource}:${permission.action}`;
    if (seen.has(key)) {
      return [];
    }

    seen.add(key);
    return [{ resource, action: permission.action }];
  });
}

function toRoleResponse(role: {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: { resource: string; action: string }[];
}) {
  const permissions = role.isSystem && isRole(role.id)
    ? getDefaultRolePermissions(role.id)
    : role.permissions;

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: permissions.map(permission => ({
      resource: permission.resource,
      action: permission.action,
    })),
  };
}

async function getGroupUserIds(groupId: string) {
  const rows = await db
    .select({ userId: userGroups.userId })
    .from(userGroups)
    .where(eq(userGroups.groupId, groupId));

  return rows.map(row => row.userId);
}

function uniqueIds(ids: string[] = []) {
  return [...new Set(ids)];
}

async function validateUserIds(userIds: string[] = []) {
  const uniqueUserIds = uniqueIds(userIds);

  if (uniqueUserIds.length === 0) {
    return uniqueUserIds;
  }

  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, uniqueUserIds));

  if (existingUsers.length !== uniqueUserIds.length) {
    badRequest('Unknown user');
  }

  return uniqueUserIds;
}

async function toGroupResponse(group: {
  id: string;
  name: string;
  description: string;
}) {
  const userIds = await getGroupUserIds(group.id);

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    userIds,
    memberCount: userIds.length,
  };
}

export const listUsers: AppRouteHandler<ListUsersRoute> = async (c) => {
  await requirePermission(c, 'users', 'read');

  const { search } = c.req.valid('query');

  let query = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  if (search) {
    query = query.where(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    ) as typeof query;
  }

  const allUsers = await query;

  return c.json(allUsers, HttpStatusCodes.OK);
};

export const updateUserRole: AppRouteHandler<UpdateUserRoleRoute> = async (c) => {
  await requirePermission(c, 'users', 'update');

  const { userId, role } = c.req.valid('json');

  if (!(await roleExists(role))) {
    throw new ReforumApiError({
      code: 'BAD_REQUEST',
      message: 'Unknown role',
    });
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  });

  if (!targetUser) {
    notFound('User not found');
  }

  await db.update(users).set({ role }).where(eq(users.id, userId));

  return c.json({ success: true }, HttpStatusCodes.OK);
};

export const listRoles: AppRouteHandler<ListRolesRoute> = async (c) => {
  await requirePermission(c, 'settings', 'read');

  const allRoles = await db.query.roles.findMany({
    with: {
      permissions: true,
    },
    orderBy: (roles, { asc }) => [asc(roles.isSystem), asc(roles.name)],
  });

  return c.json(allRoles.map(toRoleResponse), HttpStatusCodes.OK);
};

export const listPermissions: AppRouteHandler<ListPermissionsRoute> = async (c) => {
  await requirePermission(c, 'settings', 'read');

  return c.json(getAvailablePermissions(), HttpStatusCodes.OK);
};

export const createRole: AppRouteHandler<CreateRoleRoute> = async (c) => {
  await requirePermission(c, 'settings', 'update');

  const data = c.req.valid('json');
  const permissions = normalizePermissions(data.permissions);
  const roleId = newId('role');

  const created = await db.transaction(async (tx) => {
    const [role] = await tx
      .insert(roles)
      .values({
        id: roleId,
        name: data.name,
        description: data.description ?? '',
        isSystem: false,
      })
      .returning();

    if (permissions.length > 0) {
      await tx.insert(rolePermissions).values(
        permissions.map(permission => ({
          id: newId('role_permission'),
          roleId,
          resource: permission.resource,
          action: permission.action,
        }))
      );
    }

    return tx.query.roles.findFirst({
      where: eq(roles.id, role.id),
      with: { permissions: true },
    });
  });

  return c.json(toRoleResponse(created!), HttpStatusCodes.CREATED);
};

export const updateRole: AppRouteHandler<UpdateRoleRoute> = async (c) => {
  await requirePermission(c, 'settings', 'update');

  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const permissions = data.permissions
    ? normalizePermissions(data.permissions)
    : undefined;

  const existing = await db.query.roles.findFirst({
    where: eq(roles.id, id),
  });

  if (!existing) {
    notFound('Role not found');
  }

  if (existing.isSystem) {
    forbidden('System roles cannot be edited');
  }

  const updated = await db.transaction(async (tx) => {
    await tx
      .update(roles)
      .set({
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id));

    if (permissions) {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

      if (permissions.length > 0) {
        await tx.insert(rolePermissions).values(
          permissions.map(permission => ({
            id: newId('role_permission'),
            roleId: id,
            resource: permission.resource,
            action: permission.action,
          }))
        );
      }
    }

    return tx.query.roles.findFirst({
      where: eq(roles.id, id),
      with: { permissions: true },
    });
  });

  return c.json(toRoleResponse(updated!), HttpStatusCodes.OK);
};

export const deleteRole: AppRouteHandler<DeleteRoleRoute> = async (c) => {
  await requirePermission(c, 'settings', 'update');

  const { id } = c.req.valid('param');
  const existing = await db.query.roles.findFirst({
    where: eq(roles.id, id),
  });

  if (!existing) {
    notFound('Role not found');
  }

  if (existing.isSystem) {
    forbidden('System roles cannot be deleted');
  }

  const [assignment] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.role, id));

  if (Number(assignment?.count ?? 0) > 0) {
    badRequest('Cannot delete a role that is assigned to users');
  }

  await db.delete(roles).where(eq(roles.id, id));

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const listGroups: AppRouteHandler<ListGroupsRoute> = async (c) => {
  await requirePermission(c, 'group', 'read');

  const allGroups = await db.query.groups.findMany({
    orderBy: (groups, { asc }) => [asc(groups.name)],
  });

  const response = await Promise.all(allGroups.map(toGroupResponse));

  return c.json(response, HttpStatusCodes.OK);
};

export const createGroup: AppRouteHandler<CreateGroupRoute> = async (c) => {
  await requirePermission(c, 'group', 'create');

  const data = c.req.valid('json');
  const groupId = newId('group');
  const userIds = await validateUserIds(data.userIds);

  const created = await db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        id: groupId,
        name: data.name,
        description: data.description ?? '',
      })
      .returning();

    if (userIds.length > 0) {
      await tx.insert(userGroups).values(
        userIds.map(userId => ({
          id: newId('user_group'),
          groupId,
          userId,
        }))
      );
    }

    return group;
  });

  return c.json(await toGroupResponse(created), HttpStatusCodes.CREATED);
};

export const updateGroup: AppRouteHandler<UpdateGroupRoute> = async (c) => {
  await requirePermission(c, 'group', 'update');

  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const userIds = data.userIds
    ? await validateUserIds(data.userIds)
    : undefined;
  const existing = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });

  if (!existing) {
    notFound('Group not found');
  }

  const updated = await db.transaction(async (tx) => {
    const [group] = await tx
      .update(groups)
      .set({
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        updatedAt: new Date(),
      })
      .where(eq(groups.id, id))
      .returning();

    if (userIds) {
      await tx.delete(userGroups).where(eq(userGroups.groupId, id));

      if (userIds.length > 0) {
        await tx.insert(userGroups).values(
          userIds.map(userId => ({
            id: newId('user_group'),
            groupId: id,
            userId,
          }))
        );
      }
    }

    return group;
  });

  return c.json(await toGroupResponse(updated), HttpStatusCodes.OK);
};

export const deleteGroup: AppRouteHandler<DeleteGroupRoute> = async (c) => {
  await requirePermission(c, 'group', 'delete');

  const { id } = c.req.valid('param');
  const existing = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });

  if (!existing) {
    notFound('Group not found');
  }

  const [categoryAssignment] = await db
    .select({ count: count() })
    .from(categoryGroups)
    .where(eq(categoryGroups.groupId, id));

  if (Number(categoryAssignment?.count ?? 0) > 0) {
    badRequest('Cannot delete a group assigned to categories');
  }

  await db.delete(groups).where(eq(groups.id, id));

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
