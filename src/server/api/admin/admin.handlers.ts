import type { AppRouteHandler } from '@/types';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { isAuthorized } from '@/server/api-auth';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { ListUsersRoute, UpdateUserRoleRoute } from './admin.routes';

export const listUsers: AppRouteHandler<ListUsersRoute> = async (c) => {
  isAuthorized(c, 'admin');

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
  isAuthorized(c, 'admin');

  const { userId, role } = c.req.valid('json');

  await db.update(users).set({ role }).where(eq(users.id, userId));

  return c.json({ success: true }, HttpStatusCodes.OK);
};
