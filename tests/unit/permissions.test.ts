import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  query: {
    roles: {
      findFirst: vi.fn(),
    },
    rolePermissions: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/server/db', () => ({
  db: dbMock,
}));

import {
  canManageContent,
  hasPermission,
  hasRolePermission,
  roleExists,
} from '@/server/lib/permissions';

beforeEach(() => {
  dbMock.query.roles.findFirst.mockReset();
  dbMock.query.rolePermissions.findFirst.mockReset();
});

describe('role permissions', () => {
  it('does not allow users to mutate tags or categories', () => {
    expect(hasPermission('user', 'tag', 'create')).toBe(false);
    expect(hasPermission('user', 'tag', 'update')).toBe(false);
    expect(hasPermission('user', 'tag', 'delete')).toBe(false);
    expect(hasPermission('user', 'category', 'create')).toBe(false);
    expect(hasPermission('user', 'category', 'update')).toBe(false);
    expect(hasPermission('user', 'category', 'delete')).toBe(false);
  });

  it('keeps moderator and admin mutation paths distinct', () => {
    expect(hasPermission('moderator', 'tag', 'create')).toBe(true);
    expect(hasPermission('moderator', 'tag', 'update')).toBe(true);
    expect(hasPermission('moderator', 'tag', 'delete')).toBe(false);
    expect(hasPermission('moderator', 'category', 'create')).toBe(false);

    expect(hasPermission('admin', 'tag', 'delete')).toBe(true);
    expect(hasPermission('admin', 'category', 'create')).toBe(true);
    expect(hasPermission('admin', 'category', 'update')).toBe(true);
    expect(hasPermission('admin', 'category', 'delete')).toBe(true);
  });

  it('allows users to submit flags without granting moderation queue access', () => {
    expect(hasPermission('user', 'moderation', 'create')).toBe(true);
    expect(hasPermission('user', 'moderation', 'read')).toBe(false);
    expect(hasPermission('user', 'moderation', 'update')).toBe(false);

    expect(hasPermission('moderator', 'moderation', 'read')).toBe(true);
    expect(hasPermission('moderator', 'moderation', 'update')).toBe(true);
    expect(hasPermission('admin', 'moderation', 'read')).toBe(true);
    expect(hasPermission('admin', 'moderation', 'update')).toBe(true);
  });
});

describe('database-backed role permissions', () => {
  it('recognizes custom roles stored in the database', async () => {
    dbMock.query.roles.findFirst.mockResolvedValue({
      id: 'role_editor',
      name: 'editor',
      isSystem: false,
    });

    await expect(roleExists('role_editor')).resolves.toBe(true);
  });

  it('checks custom role permissions from role permission rows', async () => {
    dbMock.query.roles.findFirst.mockResolvedValue({
      id: 'role_editor',
      name: 'editor',
      isSystem: false,
    });
    dbMock.query.rolePermissions.findFirst.mockResolvedValue({
      id: 'role_permission_1',
      roleId: 'role_editor',
      resource: 'post',
      action: 'update',
    });

    await expect(hasRolePermission('role_editor', 'post', 'update')).resolves.toBe(true);
  });

  it('falls back to the static matrix for default roles when seed rows are missing', async () => {
    dbMock.query.roles.findFirst.mockResolvedValue(undefined);

    await expect(hasRolePermission('moderator', 'comment', 'delete')).resolves.toBe(true);
    await expect(hasRolePermission('user', 'category', 'update')).resolves.toBe(false);
  });
});

describe('content ownership permissions', () => {
  it('allows users to update and delete their own content', () => {
    const actor = { id: 'user_1', role: 'user' };

    expect(canManageContent(actor, 'post', 'user_1', 'update')).toBe(true);
    expect(canManageContent(actor, 'post', 'user_1', 'delete')).toBe(true);
    expect(canManageContent(actor, 'comment', 'user_1', 'update')).toBe(true);
    expect(canManageContent(actor, 'comment', 'user_1', 'delete')).toBe(true);
  });

  it('blocks users from mutating content owned by someone else', () => {
    const actor = { id: 'user_1', role: 'user' };

    expect(canManageContent(actor, 'post', 'user_2', 'update')).toBe(false);
    expect(canManageContent(actor, 'post', 'user_2', 'delete')).toBe(false);
    expect(canManageContent(actor, 'comment', 'user_2', 'update')).toBe(false);
    expect(canManageContent(actor, 'comment', 'user_2', 'delete')).toBe(false);
  });

  it('allows moderators and admins to mutate content owned by someone else', () => {
    expect(canManageContent({ id: 'mod_1', role: 'moderator' }, 'post', 'user_1', 'update')).toBe(true);
    expect(canManageContent({ id: 'mod_1', role: 'moderator' }, 'comment', 'user_1', 'delete')).toBe(true);
    expect(canManageContent({ id: 'admin_1', role: 'admin' }, 'post', 'user_1', 'delete')).toBe(true);
    expect(canManageContent({ id: 'admin_1', role: 'admin' }, 'comment', 'user_1', 'update')).toBe(true);
  });
});
