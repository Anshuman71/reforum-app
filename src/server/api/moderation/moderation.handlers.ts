import type { AppRouteHandler } from '@/types';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import {
  createFlag,
  listFlags,
  reviewFlag,
} from '@/server/services/moderation';
import type {
  CreateFlagRoute,
  ListFlagsRoute,
  ReviewFlagRoute,
} from './moderation.routes';

export const create: AppRouteHandler<CreateFlagRoute> = async c => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const flag = await createFlag({
    actor,
    targetType: data.targetType,
    targetId: data.targetId,
    reason: data.reason,
    details: data.details,
  });

  return c.json(flag, HttpStatusCodes.CREATED);
};

export const list: AppRouteHandler<ListFlagsRoute> = async c => {
  const query = c.req.valid('query');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const flags = await listFlags({
    actor,
    status: query.status,
    limit: query.limit,
  });

  return c.json(flags, HttpStatusCodes.OK);
};

export const review: AppRouteHandler<ReviewFlagRoute> = async c => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const flag = await reviewFlag({
    actor,
    id,
    status: data.status,
    contentAction: data.contentAction,
  });

  return c.json(flag, HttpStatusCodes.OK);
};
