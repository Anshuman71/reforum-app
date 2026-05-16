import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  api: {
    getSession: vi.fn(),
  },
}));

const dbMock = vi.hoisted(() => {
  const roleLookup = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  const updateQuery = {
    set: vi.fn(),
    where: vi.fn(),
  };

  roleLookup.from.mockReturnValue(roleLookup);
  roleLookup.where.mockReturnValue(roleLookup);
  updateQuery.set.mockReturnValue(updateQuery);

  return {
    roleLookup,
    updateQuery,
    select: vi.fn(() => roleLookup),
    update: vi.fn(() => updateQuery),
    query: {
      flags: {
        findMany: vi.fn(),
      },
      roles: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
      categories: {
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/server/lib/auth', () => ({
  auth: authMock,
}));
vi.mock('@/server/db', () => ({
  db: dbMock,
}));
vi.mock('@/server/lib/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/lib/permissions')>();

  return {
    ...actual,
    hasRolePermission: vi.fn(async (role: string, resource: string, action: string) => {
      if (role === 'admin') {
        return true;
      }

      if (resource !== 'moderation') {
        return false;
      }

      if (role === 'user') {
        return action === 'create';
      }

      return ['moderator', 'admin'].includes(role);
    }),
  };
});

import createApp from '@/server/common/create-app';
import { adminRouter } from '@/server/api/admin/admin.index';
import { categoriesRouter } from '@/server/api/categories/categories.index';
import { moderationRouter } from '@/server/api/moderation/moderation.index';

function appWithRbacRoutes() {
  const app = createApp();
  app.route('/', adminRouter);
  app.route('/', categoriesRouter);
  app.route('/', moderationRouter);
  return app;
}

function selectWithLimit(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };

  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.limit.mockResolvedValue(rows);

  return query as any;
}

function selectWhereRows(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
  };

  query.from.mockReturnValue(query);
  query.where.mockResolvedValue(rows);

  return query as any;
}

function selectInnerJoinRows(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
  };

  query.from.mockReturnValue(query);
  query.innerJoin.mockResolvedValue(rows);

  return query as any;
}

beforeEach(() => {
  authMock.api.getSession.mockReset();
  dbMock.select.mockClear();
  dbMock.roleLookup.limit.mockReset();
  dbMock.update.mockClear();
  dbMock.updateQuery.set.mockClear();
  dbMock.updateQuery.where.mockReset();
  dbMock.query.flags.findMany.mockReset();
  dbMock.query.roles.findFirst.mockReset();
  dbMock.query.users.findFirst.mockReset();
  dbMock.query.categories.findMany.mockReset();
});

describe('RBAC API integration', () => {
  it('uses the session role to block users from the moderation queue', async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: 'user_1', name: 'User', email: 'u@example.com' },
      session: { id: 'session_1' },
    });
    dbMock.roleLookup.limit.mockResolvedValue([{ role: 'user' }]);

    const response = await appWithRbacRoutes().request('/api/moderation/flags');

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'FORBIDDEN' },
    });
    expect(dbMock.query.flags.findMany).not.toHaveBeenCalled();
  });

  it('uses the session role to allow moderators into the moderation queue', async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: 'mod_1', name: 'Mod', email: 'm@example.com' },
      session: { id: 'session_1' },
    });
    dbMock.roleLookup.limit.mockResolvedValue([{ role: 'moderator' }]);
    dbMock.query.flags.findMany.mockResolvedValue([]);

    const response = await appWithRbacRoutes().request('/api/moderation/flags');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
    expect(dbMock.query.flags.findMany).toHaveBeenCalledTimes(1);
  });

  it('allows an admin session to assign a database-backed custom role', async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: 'admin_1', name: 'Admin', email: 'a@example.com' },
      session: { id: 'session_1' },
    });
    dbMock.roleLookup.limit.mockResolvedValue([{ role: 'admin' }]);
    dbMock.query.roles.findFirst.mockResolvedValue({
      id: 'role_editor',
      name: 'editor',
      isSystem: false,
    });
    dbMock.query.users.findFirst.mockResolvedValue({ id: 'user_1' });
    dbMock.updateQuery.where.mockResolvedValue(undefined);

    const response = await appWithRbacRoutes().request('/api/admin/users/role', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: 'user_1',
        role: 'role_editor',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(dbMock.updateQuery.set).toHaveBeenCalledWith({ role: 'role_editor' });
  });

  it('uses session-backed group membership to include private categories', async () => {
    authMock.api.getSession.mockResolvedValue({
      user: { id: 'user_1', name: 'User', email: 'u@example.com' },
      session: { id: 'session_1' },
    });

    dbMock.select
      .mockImplementationOnce(() => selectWithLimit([{ role: 'user' }]))
      .mockImplementationOnce(() => selectWithLimit([{ role: 'user' }]))
      .mockImplementationOnce(() => selectWhereRows([{ id: 'category_public' }]))
      .mockImplementationOnce(() => selectInnerJoinRows([{ id: 'category_private' }]))
      .mockImplementation(() => selectWhereRows([]));
    dbMock.query.roles.findFirst.mockResolvedValue(undefined);
    dbMock.query.categories.findMany.mockResolvedValue([
      {
        id: 'category_public',
        name: 'Public',
        description: '',
        isPrivate: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'category_private',
        name: 'Private',
        description: '',
        isPrivate: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const response = await appWithRbacRoutes().request('/api/categories');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.map((category: { id: string }) => category.id)).toEqual([
      'category_public',
      'category_private',
    ]);
    expect(dbMock.query.categories.findMany).toHaveBeenCalledTimes(1);
  });
});
