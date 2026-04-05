import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { tags, posts } from '@/server/db/schema';
import {
  commonInsertOmitFields,
  getIdParamsSchema,
  notFoundSchema,
} from '@/server/common/constants';
import { authMiddleware } from '@/server/common/middlewares';
import { openApiErrorResponses } from '@/server/errors';

const IdParamsSchema = getIdParamsSchema('tag');

const tagsSelectSchema = createSelectSchema(tags);

const tagsCreateSchema = createInsertSchema(tags).omit({
  ...commonInsertOmitFields,
});

// Posts schema for tag-posts relationship
const PostWithSlugSchema = createSelectSchema(posts).extend({
    slug: z.string(),
  });

const API_TAG = ['Tags'];

export const list = createRoute({
  path: '/',
  method: 'get',
  tags: API_TAG,
  summary: 'List tags',
  description: 'Get a list of tags',
  middleware: [authMiddleware],
  request: {
    query: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      name: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(tagsSelectSchema),
      'The list of tags'
    ),
    ...openApiErrorResponses,
  },
});

export const create = createRoute({
  path: '/',
  method: 'post',
  tags: API_TAG,
  summary: 'Create a tag',
  description: 'Create a tag',
  middleware: [authMiddleware],
  request: {
    body: jsonContentRequired(tagsCreateSchema, 'The tag to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(tagsSelectSchema, 'The created tag'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(tagsSelectSchema),
      'The validation error(s)'
    ),
    ...openApiErrorResponses,
  },
});

export const getById = createRoute({
  path: '/:id',
  method: 'get',
  tags: API_TAG,
  summary: 'Get a tag',
  description: 'Get a tag',
  middleware: [authMiddleware],

  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(tagsSelectSchema, 'The requested tag'),
    ...openApiErrorResponses,
  },
});

export const updateById = createRoute({
  path: '/:id',
  method: 'patch',
  tags: API_TAG,
  summary: 'Update a tag',
  description: 'Update a tag',
  middleware: [authMiddleware],

  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(tagsCreateSchema, 'The updated tag'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(tagsSelectSchema, 'The updated tag'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, 'Tag not found'),
  },
});

export const deleteById = createRoute({
  path: '/:id',
  method: 'delete',
  summary: 'Delete a tag',
  description: 'Delete a tag',
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

// Posts listing route
export const listTagPosts = createRoute({
  path: '/:id/posts',
  method: 'get',
  tags: API_TAG,
  summary: 'List posts for a tag',
  description: 'Get all posts associated with a specific tag',
  middleware: [authMiddleware],
  request: {
    params: IdParamsSchema,
    query: z.object({
      limit: z.string().optional(),
      offset: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(PostWithSlugSchema),
      'The list of posts for the tag'
    ),
    ...openApiErrorResponses,
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetRoute = typeof getById;
export type UpdateRoute = typeof updateById;
export type DeleteRoute = typeof deleteById;
export type ListTagPostsRoute = typeof listTagPosts;
