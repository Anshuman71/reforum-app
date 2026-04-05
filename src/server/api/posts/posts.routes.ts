import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { posts, postTags, tags as tagsTable } from '@/server/db/schema';
import {
  commonInsertOmitFields,
  createIdValidator,
  getIdParamsSchema,
  notFoundSchema,
} from '@/server/common/constants';
import { commentsSelectSchema } from '../comments/comments.routes';
import { authMiddleware } from '@/server/common/middlewares';
import { openApiErrorResponses } from '@/server/errors';

const tags = ['Posts'];

const IdParamsSchema = getIdParamsSchema('post');

const PostSelectSchema = createSelectSchema(posts).extend({
    slug: z.string(),
  });

const PostCreateSchema = createInsertSchema(posts)
  .omit({
    state: true,
    slug: true,
    isPinned: true,
    pinnedAt: true,
    contentJson: true,
    contentHtml: true,
    ...commonInsertOmitFields,
  })
  .extend({
    content: z.string().min(1).max(50000),
    tags: z.array(createIdValidator('tag')).optional().default([]),
  });

const UpdatePostSchema = createInsertSchema(posts)
  .pick({
    title: true,
    categoryId: true,
  })
  .extend({
    title: z.string().min(3).max(100).optional(),
    categoryId: createIdValidator('category').optional(),
    tags: z.array(createIdValidator('tag')).optional(),
  });

// PostTags schemas
const PostTagSelectSchema = createSelectSchema(postTags).extend({
  tag: createSelectSchema(tagsTable),
});

const PostTagCreateSchema = z.object({
  tagId: createIdValidator('tag'),
});

export const list = createRoute({
  path: '/',
  method: 'get',
  summary: 'List posts',
  tags,
  request: {
    query: z.object({
      limit: z.string().optional(),
      offset: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  },
  middleware: [authMiddleware],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(PostSelectSchema),
      'The list of posts'
    ),
    ...openApiErrorResponses,
  },
});

export const create = createRoute({
  path: '/',
  method: 'post',
  summary: 'Create a post',
  request: {
    body: jsonContentRequired(PostCreateSchema, 'The post to create'),
  },
  middleware: [authMiddleware],
  tags,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      PostSelectSchema,
      'The created Item'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      notFoundSchema,
      'The validation error(s)'
    ),
  },
});

export const listComments = createRoute({
  path: '/:id/comments',
  method: 'get',
  tags,
  summary: 'List post comments',
  description: 'Get a list of post comments',
  middleware: [authMiddleware],

  request: {
    params: IdParamsSchema,
    query: z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      name: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(commentsSelectSchema),
      'The list of comments'
    ),
    ...openApiErrorResponses,
  },
});

export const updateById = createRoute({
  path: '/:id',
  method: 'patch',
  tags,
  summary: 'Update a post',
  description: 'Update a post',
  middleware: [authMiddleware],

  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(UpdatePostSchema, 'The updated post'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(PostSelectSchema, 'The updated post'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PostSelectSchema),
      'The validation error(s)'
    ),
    ...openApiErrorResponses,
  },
});

export const deleteById = createRoute({
  path: '/:id',
  method: 'delete',
  tags,
  summary: 'Delete a post',
  description: 'Delete a post',
  middleware: [authMiddleware],
  request: {
    params: IdParamsSchema,
  },
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

// PostTags routes
export const listPostTags = createRoute({
  path: '/:id/tags',
  method: 'get',
  summary: 'List tags for a post',
  description: 'Get all tags associated with a specific post',
  tags,
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
      z.array(PostTagSelectSchema),
      'The list of post tags'
    ),
    ...openApiErrorResponses,
  },
});

export const addPostTag = createRoute({
  path: '/:id/tags',
  method: 'post',
  summary: 'Add a tag to a post',
  description: 'Associate a tag with a specific post',
  tags,
  middleware: [authMiddleware],
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(PostTagCreateSchema, 'The tag to add'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      PostTagSelectSchema,
      'The created post tag relationship'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PostTagCreateSchema),
      'The validation error(s)'
    ),
    ...openApiErrorResponses,
  },
});

export const removePostTag = createRoute({
  path: '/:postId/tags/:tagId',
  method: 'delete',
  summary: 'Remove a tag from a post',
  description: 'Remove the association between a tag and a post',
  tags,
  middleware: [authMiddleware],
  request: {
    params: z.object({
      postId: z.string().min(1),
      tagId: z.string().min(1),
    }),
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: 'Tag removed from post',
    },
    ...openApiErrorResponses,
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type ListCommentsRoute = typeof listComments;
export type UpdateByIdRoute = typeof updateById;
export type DeleteByIdRoute = typeof deleteById;
export type ListPostTagsRoute = typeof listPostTags;
export type AddPostTagRoute = typeof addPostTag;
export type RemovePostTagRoute = typeof removePostTag;
