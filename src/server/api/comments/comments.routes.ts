import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { comments } from '@/server/db/schema';
import {
  getIdParamsSchema,
} from '@/server/common/constants';
import { authMiddleware } from '@/server/common/middlewares';
import { openApiErrorResponses } from '@/server/errors';

const IdParamsSchema = getIdParamsSchema('comment');
const PostIdSchema = getIdParamsSchema('post').shape.id;

export const commentsSelectSchema = createSelectSchema(comments);
const CommentAuthorSchema = z.object({
  id: getIdParamsSchema('user').shape.id,
  name: z.string(),
  image: z.string().nullable(),
});
const commentReplySchema = z.object({
  id: IdParamsSchema.shape.id,
  content: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  replyToCommentId: IdParamsSchema.shape.id.nullable(),
  author: CommentAuthorSchema,
});

const commentsCreateSchema = z.object({
  postId: PostIdSchema,
  content: z.string().min(1).max(50000),
  replyToCommentId: getIdParamsSchema('comment').shape.id.optional().nullable(),
});

const commentsUpdateSchema = createInsertSchema(comments).pick({
  content: true,
  replyToCommentId: true,
});

const API_TAG = ['Comments'];

export const create = createRoute({
  path: '/',
  method: 'post',
  tags: API_TAG,
  summary: 'Create a comment',
  description: 'Create a comment',
  middleware: [authMiddleware],

  request: {
    body: jsonContentRequired(commentsCreateSchema, 'The comment to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      commentReplySchema,
      'The created comment'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(commentsSelectSchema),
      'The validation error(s)'
    ),
    ...openApiErrorResponses,
  },
});

export const getById = createRoute({
  path: '/:id',
  method: 'get',
  tags: API_TAG,
  summary: 'Get a comment',
  description: 'Get a comment',
  middleware: [authMiddleware],

  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      commentsSelectSchema,
      'The requested comment'
    ),
    ...openApiErrorResponses,
  },
});

export const updateById = createRoute({
  path: '/:id',
  method: 'patch',
  tags: API_TAG,
  summary: 'Update a comment',
  description: 'Update a comment',
  middleware: [authMiddleware],

  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(commentsUpdateSchema, 'The updated comment'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      commentsSelectSchema,
      'The updated comment'
    ),
    ...openApiErrorResponses,
  },
});

export const deleteById = createRoute({
  path: '/:id',
  method: 'delete',
  summary: 'Delete a comment',
  description: 'Delete a comment',
  middleware: [authMiddleware],

  request: {
    params: IdParamsSchema,
  },
  tags: API_TAG,
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: 'Item deleted',
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      'Invalid id error'
    ),
    ...openApiErrorResponses,
  },
});

// TODO: Add votes/reactions routes

export type CreateRoute = typeof create;
export type GetRoute = typeof getById;
export type UpdateRoute = typeof updateById;
export type DeleteRoute = typeof deleteById;
