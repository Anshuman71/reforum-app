import type { AppRouteHandler } from '@/types';

import {
  CreateRoute,
  DeleteRoute,
  GetRoute,
  UpdateRoute,
} from './comments.routes';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import {
  createComment,
  deleteComment,
  getCommentById,
  updateComment,
} from '@/server/services/forum';

export const create: AppRouteHandler<CreateRoute> = async c => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const comment = await createComment({
    actor,
    postId: data.postId,
    content: data.content,
    replyToCommentId: data.replyToCommentId,
  });

  return c.json(comment, HttpStatusCodes.CREATED);
};

export const get: AppRouteHandler<GetRoute> = async c => {
  const data = c.req.valid('param');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const comment = await getCommentById(data.id, actor);

  return c.json(comment, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async c => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const comment = await updateComment({
    id,
    actor,
    content: data.content,
  });

  return c.json(comment, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<DeleteRoute> = async c => {
  const data = c.req.valid('param');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  await deleteComment({
    id: data.id,
    actor,
  });

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

// TODO: Rewrite like handlers as votes/reactions
