import type { AppRouteHandler } from '@/types';

import { db } from '@/server/db';
import {
  CreateRoute,
  DeleteRoute,
  GetRoute,
  ListRoute,
  UpdateRoute,
  ListTagPostsRoute,
} from './tags.routes';
import { newId } from '@/server/lib/id';
import { eq } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as HttpStatusPhrases from 'stoker/http-status-phrases';
import { tags, posts, postTags } from '@/server/db/schema';
import { ReforumApiError } from '@/server/errors';
import slugify from 'slugify';
import { isAuthorized } from '@/server/api-auth';
import { emitBeforeEvent, emitAfterEvent } from '@/server/lib/events';

export const list: AppRouteHandler<ListRoute> = async c => {
  const queries = c.req.valid('query');
  try {
    console.time(`list-tags-${c.get('requestId')}`);
    const tags = await db.query.tags.findMany({ limit: queries.limit });
    console.timeEnd(`list-tags-${c.get('requestId')}`);
    return c.json(tags, HttpStatusCodes.OK);
  } catch (error) {
    console.error(error);
    return c.json([], HttpStatusCodes.OK);
  }
};

export const create: AppRouteHandler<CreateRoute> = async c => {
  await isAuthorized(c);
  const data = c.req.valid('json');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const ctx = await emitBeforeEvent('tag:beforeCreate', {
    data: { name: data.name },
    actor,
    meta: {},
  });

  const tagId = newId('tag');

  const [tag] = await db
    .insert(tags)
    .values({
      id: tagId,
      name: ctx.data.name,
    })
    .returning();

  emitAfterEvent('tag:afterCreate', { entity: tag, actor, meta: {} });

  return c.json(tag, HttpStatusCodes.CREATED);
};

export const get: AppRouteHandler<GetRoute> = async c => {
  const data = c.req.valid('param');

  const tag = await db.query.tags.findFirst({
    where: eq(tags.id, data.id),
  });

  if (!tag) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  return c.json(tag, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async c => {
  const data = c.req.valid('param');
  const { name } = c.req.valid('json');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const existing = await db.query.tags.findFirst({
    where: eq(tags.id, data.id),
  });

  if (!existing) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  const ctx = await emitBeforeEvent('tag:beforeUpdate', {
    entity: existing,
    data: { name },
    actor,
    meta: {},
  });

  const [tag] = await db
    .update(tags)
    .set({ name: ctx.data.name })
    .where(eq(tags.id, data.id))
    .returning();

  emitAfterEvent('tag:afterUpdate', { entity: tag, actor, meta: {} });

  return c.json(tag, HttpStatusCodes.OK);
};

export const deleteById: AppRouteHandler<DeleteRoute> = async c => {
  const data = c.req.valid('param');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const existing = await db.query.tags.findFirst({
    where: eq(tags.id, data.id),
  });

  if (!existing) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  await emitBeforeEvent('tag:beforeDelete', {
    entity: existing,
    actor,
    meta: {},
  });

  await db
    .delete(tags)
    .where(eq(tags.id, data.id));

  emitAfterEvent('tag:afterDelete', { entity: existing, actor, meta: {} });

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

// Posts listing handler
export const listTagPosts: AppRouteHandler<ListTagPostsRoute> = async c => {
  const { id: tagId } = c.req.valid('param');
  const queries = c.req.valid('query');

  // Check if tag exists
  const tag = await db.query.tags.findFirst({
    where: eq(tags.id, tagId),
  });

  if (!tag) {
    throw new ReforumApiError({
      message: 'Tag not found',
      code: 'NOT_FOUND',
    });
  }

  // Get posts through the postTags junction table
  const postsList = await db.query.posts.findMany({
    where: eq(posts.state, 'active'),
    with: {
      postTags: {
        where: eq(postTags.tagId, tagId),
      },
    },
    limit: Number(queries.limit ?? 20),
    offset: Number(queries.offset ?? 0),
  });

  // Filter posts that actually have the tag (due to join limitations)
  const filteredPosts = postsList.filter(post => post.postTags.length > 0);

  // Add slug to each post
  const postsWithSlug = filteredPosts.map(post => ({
    ...post,
    slug: slugify(post.title, { lower: true }),
    postTags: undefined, // Remove postTags from response
  }));

  return c.json(postsWithSlug, HttpStatusCodes.OK);
};
