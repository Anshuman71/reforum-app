import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  query: {
    flags: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    posts: {
      findFirst: vi.fn(),
    },
    comments: {
      findFirst: vi.fn(),
    },
  },
  transaction: vi.fn(),
}));

const permissionMock = vi.hoisted(() => ({
  hasRolePermission: vi.fn(),
  canAccessCategory: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/server/db', () => ({
  db: dbMock,
}));
vi.mock('@/server/lib/permissions', () => permissionMock);
vi.mock('@/server/lib/events', () => ({
  emitBeforeEvent: vi.fn(async (_event, ctx) => ctx),
  emitAfterEvent: vi.fn(),
}));

import { listFlags, reviewFlag } from '@/server/services/moderation';

beforeEach(() => {
  dbMock.query.flags.findMany.mockReset();
  dbMock.query.flags.findFirst.mockReset();
  dbMock.query.posts.findFirst.mockReset();
  dbMock.query.comments.findFirst.mockReset();
  dbMock.transaction.mockReset();
  permissionMock.hasRolePermission.mockReset();
  permissionMock.canAccessCategory.mockReset();
});

describe('moderation service permissions', () => {
  it('blocks regular users from reading the moderation queue', async () => {
    permissionMock.hasRolePermission.mockResolvedValue(false);

    await expect(
      listFlags({
        actor: { id: 'user_1', role: 'user' },
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    expect(dbMock.query.flags.findMany).not.toHaveBeenCalled();
  });

  it('allows moderators to read the moderation queue', async () => {
    permissionMock.hasRolePermission.mockResolvedValue(true);
    dbMock.query.flags.findMany.mockResolvedValue([]);

    await expect(
      listFlags({
        actor: { id: 'mod_1', role: 'moderator' },
        status: 'pending',
      })
    ).resolves.toEqual([]);

    expect(dbMock.query.flags.findMany).toHaveBeenCalledTimes(1);
  });

  it('filters queue items outside the moderator visible categories', async () => {
    permissionMock.hasRolePermission.mockResolvedValue(true);
    permissionMock.canAccessCategory.mockResolvedValue(false);
    dbMock.query.flags.findMany.mockResolvedValue([
      {
        id: 'flag_1',
        targetType: 'post',
        targetId: 'post_1',
      },
    ]);
    dbMock.query.posts.findFirst.mockResolvedValue({
      id: 'post_1',
      categoryId: 'category_private',
      state: 'active',
    });

    await expect(
      listFlags({
        actor: { id: 'mod_1', role: 'moderator' },
      })
    ).resolves.toEqual([]);

    expect(permissionMock.canAccessCategory).toHaveBeenCalledWith(
      { id: 'mod_1', role: 'moderator' },
      'category_private'
    );
  });

  it('rejects content actions when a flag is rejected', async () => {
    permissionMock.hasRolePermission.mockResolvedValue(true);
    dbMock.query.flags.findFirst.mockResolvedValue({
      id: 'flag_1',
      targetType: 'post',
      targetId: 'post_1',
      status: 'pending',
    });

    await expect(
      reviewFlag({
        actor: { id: 'mod_1', role: 'moderator' },
        id: 'flag_1',
        status: 'rejected',
        contentAction: 'hide',
      })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it('blocks flag review outside the moderator visible categories', async () => {
    permissionMock.hasRolePermission.mockResolvedValue(true);
    permissionMock.canAccessCategory.mockResolvedValue(false);
    dbMock.query.flags.findFirst.mockResolvedValue({
      id: 'flag_1',
      targetType: 'post',
      targetId: 'post_1',
      status: 'pending',
    });
    dbMock.query.posts.findFirst.mockResolvedValue({
      id: 'post_1',
      categoryId: 'category_private',
      state: 'active',
    });

    await expect(
      reviewFlag({
        actor: { id: 'mod_1', role: 'moderator' },
        id: 'flag_1',
        status: 'accepted',
        contentAction: 'hide',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    expect(dbMock.transaction).not.toHaveBeenCalled();
  });
});
