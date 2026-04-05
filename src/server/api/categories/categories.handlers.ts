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
import { emitBeforeEvent, emitAfterEvent } from '@/server/lib/events';

export const create: AppRouteHandler<CreateRoute> = async c => {
  const data = c.req.valid('json');
  const user = c.get('user');

  if (user?.role !== 'admin') {
    throw new ReforumApiError({
      message: 'Only admins can create categories',
      code: 'FORBIDDEN',
    });
  }

  const actor = { id: user.id, role: user.role };

  const ctx = await emitBeforeEvent('category:beforeCreate', {
    data: { name: data.name, description: data.description, isPrivate: data.isPrivate },
    actor,
    meta: {},
  });

  const categoryId = newId('category');

  const [category] = await db
    .insert(categories)
    .values({
      id: categoryId,
      ...ctx.data,
    })
    .returning();

  emitAfterEvent('category:afterCreate', { entity: category, actor, meta: {} });

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
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const existing = await db.query.categories.findFirst({
    where: eq(categories.id, id),
  });

  if (!existing) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  const ctx = await emitBeforeEvent('category:beforeUpdate', {
    entity: existing,
    data: { name: data.name, description: data.description, isPrivate: data.isPrivate },
    actor,
    meta: {},
  });

  const [category] = await db
    .update(categories)
    .set(ctx.data)
    .where(eq(categories.id, id))
    .returning();

  emitAfterEvent('category:afterUpdate', { entity: category, actor, meta: {} });

  return c.json(category, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<DeleteRoute> = async c => {
  const data = c.req.valid('param');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const existing = await db.query.categories.findFirst({
    where: eq(categories.id, data.id),
  });

  if (!existing) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  await emitBeforeEvent('category:beforeDelete', {
    entity: existing,
    actor,
    meta: {},
  });

  await db
    .delete(categories)
    .where(eq(categories.id, data.id));

  emitAfterEvent('category:afterDelete', { entity: existing, actor, meta: {} });

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
