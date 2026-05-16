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
import { eq, inArray } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as HttpStatusPhrases from 'stoker/http-status-phrases';
import {
  categories,
  categoryGroups,
  categoryRoles,
  groups,
  roles,
} from '@/server/db/schema';
import { ReforumApiError } from '@/server/errors';
import { emitBeforeEvent, emitAfterEvent } from '@/server/lib/events';
import { requirePermission } from '@/server/api-auth';
import { canAccessCategory, getVisibleCategoryIds } from '@/server/lib/permissions';

async function getCategoryRoleIds(categoryId: string) {
  const rows = await db
    .select({ roleId: categoryRoles.roleId })
    .from(categoryRoles)
    .where(eq(categoryRoles.categoryId, categoryId));

  return rows.map(row => row.roleId);
}

async function getCategoryGroupIds(categoryId: string) {
  const rows = await db
    .select({ groupId: categoryGroups.groupId })
    .from(categoryGroups)
    .where(eq(categoryGroups.categoryId, categoryId));

  return rows.map(row => row.groupId);
}

async function withCategoryRoleIds<T extends { id: string }>(category: T) {
  return {
    ...category,
    roleIds: await getCategoryRoleIds(category.id),
    groupIds: await getCategoryGroupIds(category.id),
  };
}

function badRequest(message: string): never {
  throw new ReforumApiError({
    message,
    code: 'BAD_REQUEST',
  });
}

function uniqueIds(ids: string[] = []) {
  return [...new Set(ids)];
}

async function validateCategoryRoleIds(roleIds: string[] = []) {
  const uniqueRoleIds = uniqueIds(roleIds);

  if (uniqueRoleIds.length === 0) {
    return uniqueRoleIds;
  }

  const existingRoles = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.id, uniqueRoleIds));

  if (existingRoles.length !== uniqueRoleIds.length) {
    badRequest('Unknown category role');
  }

  return uniqueRoleIds;
}

async function validateCategoryGroupIds(groupIds: string[] = []) {
  const uniqueGroupIds = uniqueIds(groupIds);

  if (uniqueGroupIds.length === 0) {
    return uniqueGroupIds;
  }

  const existingGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .where(inArray(groups.id, uniqueGroupIds));

  if (existingGroups.length !== uniqueGroupIds.length) {
    badRequest('Unknown category group');
  }

  return uniqueGroupIds;
}

type CategoryVisibilityWriter = Pick<typeof db, 'delete' | 'insert'>;

async function replaceCategoryRoles(
  tx: CategoryVisibilityWriter,
  categoryId: string,
  roleIds: string[] = []
) {
  await tx.delete(categoryRoles).where(eq(categoryRoles.categoryId, categoryId));

  if (roleIds.length === 0) {
    return;
  }

  await tx.insert(categoryRoles).values(
    roleIds.map(roleId => ({
      id: newId('category_role'),
      categoryId,
      roleId,
    }))
  );
}

async function replaceCategoryGroups(
  tx: CategoryVisibilityWriter,
  categoryId: string,
  groupIds: string[] = []
) {
  await tx.delete(categoryGroups).where(eq(categoryGroups.categoryId, categoryId));

  if (groupIds.length === 0) {
    return;
  }

  await tx.insert(categoryGroups).values(
    groupIds.map(groupId => ({
      id: newId('category_group'),
      categoryId,
      groupId,
    }))
  );
}

export const create: AppRouteHandler<CreateRoute> = async c => {
  const data = c.req.valid('json');
  const user = await requirePermission(c, 'category', 'create');

  const actor = { id: user.id, role: user.role };
  const roleIds = await validateCategoryRoleIds(data.roleIds);
  const groupIds = await validateCategoryGroupIds(data.groupIds);

  const ctx = await emitBeforeEvent('category:beforeCreate', {
    data: { name: data.name, description: data.description, isPrivate: data.isPrivate },
    actor,
    meta: {},
  });

  const categoryId = newId('category');

  const [category] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(categories)
      .values({
        id: categoryId,
        ...ctx.data,
      })
      .returning();

    if (roleIds.length) {
      await tx.insert(categoryRoles).values(
        roleIds.map(roleId => ({
          id: newId('category_role'),
          categoryId,
          roleId,
        }))
      );
    }

    if (groupIds.length) {
      await tx.insert(categoryGroups).values(
        groupIds.map(groupId => ({
          id: newId('category_group'),
          categoryId,
          groupId,
        }))
      );
    }

    return inserted;
  });

  emitAfterEvent('category:afterCreate', { entity: category, actor, meta: {} });

  return c.json(await withCategoryRoleIds(category), HttpStatusCodes.CREATED);
};

export const list: AppRouteHandler<ListRoute> = async c => {
  const queries = c.req.valid('query');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;
  const visibleCategoryIds = await getVisibleCategoryIds(actor);

  if (visibleCategoryIds?.length === 0) {
    return c.json([], HttpStatusCodes.OK);
  }

  const categoriesRes = await db.query.categories.findMany({
    where: visibleCategoryIds ? inArray(categories.id, visibleCategoryIds) : undefined,
    limit: Number(queries.limit ?? 20),
  });

  if (!categoriesRes) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  const categoriesWithRoles = await Promise.all(categoriesRes.map(withCategoryRoleIds));

  return c.json(categoriesWithRoles, HttpStatusCodes.OK);
};

export const get: AppRouteHandler<GetRoute> = async c => {
  const data = c.req.valid('param');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const category = await db.query.categories.findFirst({
    where: eq(categories.id, data.id),
  });

  if (!category) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  if (!(await canAccessCategory(actor, category.id))) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  return c.json(await withCategoryRoleIds(category), HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async c => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const user = await requirePermission(c, 'category', 'update');
  const actor = { id: user.id, role: user.role };
  const roleIds = data.roleIds
    ? await validateCategoryRoleIds(data.roleIds)
    : undefined;
  const groupIds = data.groupIds
    ? await validateCategoryGroupIds(data.groupIds)
    : undefined;

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

  const [category] = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(categories)
      .set(ctx.data)
      .where(eq(categories.id, id))
      .returning();

    if (roleIds) {
      await replaceCategoryRoles(tx, id, roleIds);
    }

    if (groupIds) {
      await replaceCategoryGroups(tx, id, groupIds);
    }

    return [updated];
  });

  emitAfterEvent('category:afterUpdate', { entity: category, actor, meta: {} });

  return c.json(await withCategoryRoleIds(category), HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<DeleteRoute> = async c => {
  const data = c.req.valid('param');
  const user = await requirePermission(c, 'category', 'delete');
  const actor = { id: user.id, role: user.role };

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
