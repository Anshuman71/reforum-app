import { createAccessControl } from 'better-auth/plugins/access';

export type Role = 'user' | 'moderator' | 'admin';

export const statement = {
  post: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
  comment: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
  category: ['create', 'read', 'update', 'delete'],
  group: ['create', 'read', 'update', 'delete'],
  tag: ['create', 'read', 'update', 'delete'],
  upload: ['create-avatar', 'create-content'],
  moderation: ['read', 'update'],
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

export const ac = createAccessControl(statement);

const user = ac.newRole({
  post: ['create', 'read', 'update-own', 'delete-own'],
  comment: ['create', 'read', 'update-own', 'delete-own'],
  tag: ['read'],
  category: ['read'],
  upload: ['create-avatar', 'create-content'],
  notification: ['read', 'update'],
});

const moderator = ac.newRole({
  post: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
  comment: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
  tag: ['create', 'read', 'update'],
  category: ['read'],
  upload: ['create-avatar', 'create-content'],
  moderation: ['read', 'update'],
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
  moderation: ['read', 'update'],
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
    notification: ['read', 'update'],
  },
  moderator: {
    post: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
    comment: ['create', 'read', 'update', 'update-own', 'delete', 'delete-own', 'moderate'],
    category: ['read'],
    tag: ['create', 'read', 'update'],
    upload: ['create-avatar', 'create-content'],
    moderation: ['read', 'update'],
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
    moderation: ['read', 'update'],
    notification: ['read', 'update'],
    settings: ['read', 'update'],
    users: ['read', 'update', 'ban'],
  },
} as const satisfies Record<Role, Partial<{
  [Resource in PermissionResource]: readonly PermissionAction<Resource>[];
}>>;

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
