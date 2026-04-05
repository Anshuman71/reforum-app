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
import { comments } from '@/server/db/schema';
import { ReforumApiError } from '@/server/errors';

export const create: AppRouteHandler<CreateRoute> = async c => {
  const data = c.req.valid('json');

  const commentId = newId('comment');

  const [comment] = await db
    .insert(comments)
    .values({
      id: commentId,
      ...data,
    })
    .returning();

  return c.json(comment, HttpStatusCodes.CREATED);
};

export const get: AppRouteHandler<GetRoute> = async c => {
  const data = c.req.valid('param');

  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, data.id),
  });

  if (!comment) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  return c.json(comment, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async c => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');

  const [comment] = await db
    .update(comments)
    .set(data)
    .where(eq(comments.id, id))
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
    .update(comments)
    .set({ state: 'deleted' })
    .where(eq(comments.id, data.id));

  if (result.count === 0) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

// TODO: Rewrite like handlers as votes/reactions
