import type { AppRouteHandler } from '@/types';

import { db } from '@/server/db';
import {
  CreateRoute,
  DeleteRoute,
  GetRoute,
  ListRoute,
  UpdateRoute,
} from './categories.routes';
import { newId } from '@/server/lib/id';
import { eq } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as HttpStatusPhrases from 'stoker/http-status-phrases';
import { categories } from '@/server/db/schema';
import { ReforumApiError } from '@/server/errors';

export const create: AppRouteHandler<CreateRoute> = async c => {
  const data = c.req.valid('json');
  const user = c.get('user');

  if (user?.role !== 'admin') {
    throw new ReforumApiError({
      message: 'Only admins can create categories',
      code: 'FORBIDDEN',
    });
  }

  const categoryId = newId('category');

  const [category] = await db
    .insert(categories)
    .values({
      id: categoryId,
      ...data,
    })
    .returning();

  return c.json(category, HttpStatusCodes.CREATED);
};

export const list: AppRouteHandler<ListRoute> = async c => {
  const queries = c.req.valid('query');

  const categoriesRes = await db.query.categories.findMany({
    limit: Number(queries.limit ?? 20),
  });

  if (!categoriesRes) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  return c.json(categoriesRes, HttpStatusCodes.OK);
};

export const get: AppRouteHandler<GetRoute> = async c => {
  const data = c.req.valid('param');

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, data.id),
  });

  if (!category) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  return c.json(category, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async c => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const [comment] = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();

  if (!comment) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  return c.json(comment, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<DeleteRoute> = async c => {
  const data = c.req.valid('param');

  const result = await db
    .delete(categories)
    .where(eq(categories.id, data.id));

  if (result.count === 0) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
