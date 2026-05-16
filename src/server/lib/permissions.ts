import { createAccessControl } from 'better-auth/plugins/access';
import { and, eq, or } from 'drizzle-orm';
import { roleNames, type Role } from '@/lib/roles';
import { db } from '@/server/db';
import {
  categories,
  categoryGroups,
  categoryRoles,
  rolePermissions as rolePermissionsTable,
  roles as rolesTable,
  userGroups,
} from '@/server/db/schema';

export { roleNames, type Role };

export const statement = {
  post: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
  comment: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
  category: ['create', 'read', 'update', 'delete'],
  group: ['create', 'read', 'update', 'delete'],
  tag: ['create', 'read', 'update', 'delete'],
  upload: ['create-avatar', 'create-content'],
  moderation: ['create', 'read', 'update'],
  notification: ['read', 'update'],
  settings: ['read', 'update'],
  users: ['read', 'update', 'ban'],
} as const;

export type PermissionResource = keyof typeof statement;
export type PermissionAction<Resource extends PermissionResource = PermissionResource> =
  (typeof statement)[Resource][number];

export type Permission<Resource extends PermissionResource = PermissionResource> = {
  resource: Resource;
  action: PermissionAction<Resource>;
};

export type RolePermissionRecord = {
  resource: PermissionResource;
  action: PermissionAction;
};

export const ac = createAccessControl(statement);

const user = ac.newRole({
  post: ['create', 'read', 'update-own', 'delete-own'],
  comment: ['create', 'read', 'update-own', 'delete-own'],
  tag: ['read'],
  category: ['read'],
  upload: ['create-avatar', 'create-content'],
  moderation: ['create'],
  notification: ['read', 'update'],
});

const moderator = ac.newRole({
  post: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
  comment: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
  tag: ['create', 'read', 'update'],
  category: ['read'],
  upload: ['create-avatar', 'create-content'],
  moderation: ['create', 'read', 'update'],
  notification: ['read', 'update'],
  users: ['read'],
});

const admin = ac.newRole({
  post: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
  comment: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
  tag: ['create', 'read', 'update', 'delete'],
  category: ['create', 'read', 'update', 'delete'],
  group: ['create', 'read', 'update', 'delete'],
  upload: ['create-avatar', 'create-content'],
  moderation: ['create', 'read', 'update'],
  notification: ['read', 'update'],
  settings: ['read', 'update'],
  users: ['read', 'update', 'ban'],
});

export const roles = {
  user,
  moderator,
  admin,
};

export const rolePermissions = {
  user: {
    post: ['create', 'read', 'update-own', 'delete-own'],
    comment: ['create', 'read', 'update-own', 'delete-own'],
    category: ['read'],
    tag: ['read'],
    upload: ['create-avatar', 'create-content'],
    moderation: ['create'],
    notification: ['read', 'update'],
  },
  moderator: {
    post: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
    comment: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
    category: ['read'],
    tag: ['create', 'read', 'update'],
    upload: ['create-avatar', 'create-content'],
    moderation: ['create', 'read', 'update'],
    notification: ['read', 'update'],
    users: ['read'],
  },
  admin: {
    post: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
    comment: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
    category: ['create', 'read', 'update', 'delete'],
    group: ['create', 'read', 'update', 'delete'],
    tag: ['create', 'read', 'update', 'delete'],
    upload: ['create-avatar', 'create-content'],
    moderation: ['create', 'read', 'update'],
    notification: ['read', 'update'],
    settings: ['read', 'update'],
    users: ['read', 'update', 'ban'],
  },
} as const satisfies Record<Role, Partial<{
  [Resource in PermissionResource]: readonly PermissionAction<Resource>[];
}>>;

export const defaultRoleDescriptions: Record<Role, string> = {
  user: 'Default signed-in community member role.',
  moderator: 'Default content moderation role.',
  admin: 'Default site administration role.',
};

export function getAvailablePermissions(): RolePermissionRecord[] {
  return Object.entries(statement).flatMap(([resource, actions]) =>
    actions.map(action => ({
      resource: resource as PermissionResource,
      action,
    }))
  );
}

export function getDefaultRolePermissions(role: Role): RolePermissionRecord[] {
  const permissionsByResource = rolePermissions[role] as Partial<
    Record<PermissionResource, readonly PermissionAction[]>
  >;

  return Object.entries(permissionsByResource).flatMap(([resource, actions]) =>
    (actions ?? []).map(action => ({
      resource: resource as PermissionResource,
      action,
    }))
  );
}

export function isValidPermission<Resource extends PermissionResource>(
  resource: Resource,
  action: string
): action is PermissionAction<Resource> {
  return (statement[resource] as readonly string[]).includes(action);
}

export function hasPermission<Resource extends PermissionResource>(
  role: string | null | undefined,
  resource: Resource,
  action: PermissionAction<Resource>
) {
  if (!role || !(role in rolePermissions)) {
    return false;
  }

  const permissionsByResource = rolePermissions[role as Role] as Partial<
    Record<PermissionResource, readonly string[]>
  >;
  return Boolean(permissionsByResource[resource]?.includes(action));
}

export async function getRoleByKey(role: string) {
  return db.query.roles.findFirst({
    where: or(eq(rolesTable.id, role), eq(rolesTable.name, role)),
  });
}

export async function roleExists(role: string) {
  const roleRecord = await getRoleByKey(role);
  return Boolean(roleRecord) || role in rolePermissions;
}

export async function hasRolePermission<Resource extends PermissionResource>(
  role: string | null | undefined,
  resource: Resource,
  action: PermissionAction<Resource>
) {
  if (!role) {
    return false;
  }

  const roleRecord = await getRoleByKey(role);
  if (!roleRecord) {
    return hasPermission(role, resource, action);
  }

  if (roleRecord.isSystem && hasPermission(roleRecord.id, resource, action)) {
    return true;
  }

  const permission = await db.query.rolePermissions.findFirst({
    where: and(
      eq(rolePermissionsTable.roleId, roleRecord.id),
      eq(rolePermissionsTable.resource, resource),
      eq(rolePermissionsTable.action, action)
    ),
  });

  return Boolean(permission);
}

export function canManageContent(
  actor: { id: string; role: string },
  resource: 'post' | 'comment',
  authorId: string,
  action: 'update' | 'delete'
) {
  if (hasPermission(actor.role, resource, action)) {
    return true;
  }

  if (actor.id === authorId && hasPermission(actor.role, resource, `${action}-own`)) {
    return true;
  }

  return false;
}

export async function canRoleManageContent(
  actor: { id: string; role: string },
  resource: 'post' | 'comment',
  authorId: string,
  action: 'update' | 'delete'
) {
  if (await hasRolePermission(actor.role, resource, action)) {
    return true;
  }

  if (
    actor.id === authorId &&
    await hasRolePermission(actor.role, resource, `${action}-own`)
  ) {
    return true;
  }

  return false;
}

export async function getVisibleCategoryIds(actor: { id: string; role: string } | null) {
  if (actor && (await hasRolePermission(actor.role, 'settings', 'read'))) {
    return null;
  }

  const publicCategories = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.isPrivate, false));

  const visibleIds = new Set(publicCategories.map(category => category.id));

  if (!actor) {
    return [...visibleIds];
  }

  const roleRecord = await getRoleByKey(actor.role);

  if (roleRecord) {
    const roleCategories = await db
      .select({ id: categoryRoles.categoryId })
      .from(categoryRoles)
      .where(eq(categoryRoles.roleId, roleRecord.id));

    for (const category of roleCategories) {
      visibleIds.add(category.id);
    }
  }

  const groupCategories = await db
    .select({ id: categoryGroups.categoryId })
    .from(categoryGroups)
    .innerJoin(
      userGroups,
      and(
        eq(userGroups.groupId, categoryGroups.groupId),
        eq(userGroups.userId, actor.id)
      )
    );

  for (const category of groupCategories) {
    visibleIds.add(category.id);
  }

  return [...visibleIds];
}

export async function canAccessCategory(
  actor: { id: string; role: string } | null,
  categoryId: string
) {
  const visibleCategoryIds = await getVisibleCategoryIds(actor);
  return visibleCategoryIds === null || visibleCategoryIds.includes(categoryId);
}
