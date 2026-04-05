import { createAccessControl } from 'better-auth/plugins/access';

export const statement = {
  post: ['create', 'read', 'update', 'delete'],
  comment: ['create', 'read', 'update', 'delete'],
  category: ['create', 'read', 'update', 'delete'],
  group: ['create', 'read', 'update', 'delete'],
  tag: ['create', 'read', 'update', 'delete'],
  settings: ['read', 'update'],
  users: ['read', 'update', 'ban'],
} as const;

export const ac = createAccessControl(statement);

const user = ac.newRole({
  post: ['create', 'read'],
  comment: ['create', 'read'],
  tag: ['read'],
  category: ['read'],
});

const moderator = ac.newRole({
  post: ['create', 'read', 'update', 'delete'],
  comment: ['create', 'read', 'update', 'delete'],
  tag: ['create', 'read', 'update'],
  category: ['read'],
  users: ['read'],
});

const admin = ac.newRole({
  post: ['create', 'read', 'update', 'delete'],
  comment: ['create', 'read', 'update', 'delete'],
  tag: ['create', 'read', 'update', 'delete'],
  category: ['create', 'read', 'update', 'delete'],
  group: ['create', 'read', 'update', 'delete'],
  settings: ['read', 'update'],
  users: ['read', 'update', 'ban'],
});

export const roles = {
  user,
  moderator,
  admin,
};
