import type { AppRouteHandler } from '@/types';

import { db } from '@/server/db';
import {
  CreateRoute,
  DeleteRoute,
  GetRoute,
  UpdateRoute,
} from './comments.routes';
import { newId } from '@/server/lib/id';
import { eq } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as HttpStatusPhrases from 'stoker/http-status-phrases';
import { comments, posts } from '@/server/db/schema';
import { ReforumApiError } from '@/server/errors';
import { emitBeforeEvent, emitAfterEvent } from '@/server/lib/events';

export const create: AppRouteHandler<CreateRoute> = async c => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const ctx = await emitBeforeEvent('comment:beforeCreate', {
    data: { postId: data.postId, authorId: data.authorId, content: data.content, replyToCommentId: data.replyToCommentId ?? undefined },
    actor,
    meta: {},
  });

  const commentId = newId('comment');

  const [comment] = await db
    .insert(comments)
    .values({
      id: commentId,
      ...ctx.data,
    })
    .returning();

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, comment.postId),
  });

  emitAfterEvent('comment:afterCreate', { entity: comment, actor, meta: {}, post: post! });

  return c.json(comment, HttpStatusCodes.CREATED);
};

export const get: AppRouteHandler<GetRoute> = async c => {
  const data = c.req.valid('param');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, data.id),
  });

  if (!comment) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  emitAfterEvent('comment:afterRead', { entity: comment, actor, meta: {} });

  return c.json(comment, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async c => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const existing = await db.query.comments.findFirst({
    where: eq(comments.id, id),
  });

  if (!existing) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  const ctx = await emitBeforeEvent('comment:beforeUpdate', {
    entity: existing,
    data: { content: data.content },
    actor,
    meta: {},
  });

  const [comment] = await db
    .update(comments)
    .set(ctx.data)
    .where(eq(comments.id, id))
    .returning();

  emitAfterEvent('comment:afterUpdate', { entity: comment, actor, meta: {} });

  return c.json(comment, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<DeleteRoute> = async c => {
  const data = c.req.valid('param');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const existing = await db.query.comments.findFirst({
    where: eq(comments.id, data.id),
  });

  if (!existing) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  await emitBeforeEvent('comment:beforeDelete', {
    entity: existing,
    actor,
    meta: {},
  });

  await db
    .update(comments)
    .set({ state: 'deleted' })
    .where(eq(comments.id, data.id));

  emitAfterEvent('comment:afterDelete', { entity: existing, actor, meta: {} });

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

// TODO: Rewrite like handlers as votes/reactions
