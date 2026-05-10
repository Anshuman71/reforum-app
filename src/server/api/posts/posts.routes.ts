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
import { authMiddleware } from '@/server/common/middlewares';
import { openApiErrorResponses } from '@/server/errors';

const tags = ['Posts'];
const IdParamsSchema = getIdParamsSchema('post');

const PublicUserSchema = z.object({
  id: createIdValidator('user'),
  name: z.string(),
  image: z.string().nullable(),
});

const CategorySummarySchema = z.object({
  id: createIdValidator('category'),
  name: z.string(),
  isPrivate: z.boolean(),
});

const FeedPostSchema = z.object({
  id: createIdValidator('post'),
  title: z.string(),
  slug: z.string(),
  state: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  isPinned: z.boolean(),
  pinnedAt: z.union([z.string(), z.date(), z.null()]),
  author: PublicUserSchema,
  category: CategorySummarySchema,
  commentsCount: z.number().int().nonnegative(),
});

const ThreadBodySchema = z.object({
  id: createIdValidator('comment'),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  author: PublicUserSchema,
});

const ThreadPostSchema = z.object({
  id: createIdValidator('post'),
  title: z.string(),
  slug: z.string(),
  state: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  author: PublicUserSchema,
  category: CategorySummarySchema,
  contentJson: z.unknown().nullable(),
  contentHtml: z.string().nullable(),
  body: ThreadBodySchema.nullable(),
  repliesCount: z.number().int().nonnegative(),
});

const ThreadReplySchema = z.object({
  id: createIdValidator('comment'),
  contentJson: z.unknown().nullable(),
  contentHtml: z.string().nullable(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  replyToCommentId: createIdValidator('comment').nullable(),
  author: PublicUserSchema,
});

const CursorPageSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
  });

function hasRichContent(value: {
  contentJson?: unknown | null;
  contentHtml?: string | null;
}) {
  const hasTextContent = value.contentHtml
    ? value.contentHtml.replace(/<[^>]+>/g, ' ').trim().length > 0
    : false;
  const hasMediaContent = Boolean(value.contentHtml?.includes('<img'));

  return Boolean(value.contentJson) || hasTextContent || hasMediaContent;
}

const PostCreateSchema = z.object({
  title: z.string().min(3).max(100),
  contentJson: z.unknown().optional().nullable(),
  contentHtml: z.string().max(200000).optional().nullable(),
  categoryId: createIdValidator('category'),
  tags: z.array(createIdValidator('tag')).optional().default([]),
}).superRefine((value, ctx) => {
  if (!hasRichContent(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Post content is required',
      path: ['contentJson'],
    });
  }
});

const UpdatePostSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  categoryId: createIdValidator('category').optional(),
  tags: z.array(createIdValidator('tag')).optional(),
});

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
      cursor: z.string().optional(),
    }),
  },
  middleware: [authMiddleware],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      CursorPageSchema(FeedPostSchema),
      'A paginated list of posts'
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
      FeedPostSchema,
      'The created post'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      notFoundSchema,
      'The validation error(s)'
    ),
    ...openApiErrorResponses,
  },
});

export const getById = createRoute({
  path: '/:id',
  method: 'get',
  summary: 'Get thread details',
  tags,
  request: {
    params: IdParamsSchema,
  },
  middleware: [authMiddleware],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ThreadPostSchema,
      'The requested thread'
    ),
    ...openApiErrorResponses,
  },
});

export const listComments = createRoute({
  path: '/:id/comments',
  method: 'get',
  tags,
  summary: 'List thread replies',
  description: 'Get a cursor-paginated list of replies for a thread',
  middleware: [authMiddleware],
  request: {
    params: IdParamsSchema,
    query: z.object({
      limit: z.string().optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      CursorPageSchema(ThreadReplySchema),
      'The list of thread replies'
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
    [HttpStatusCodes.OK]: jsonContent(
      createSelectSchema(posts),
      'The updated post'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(createSelectSchema(posts)),
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
export type GetRoute = typeof getById;
export type ListCommentsRoute = typeof listComments;
export type UpdateByIdRoute = typeof updateById;
export type DeleteByIdRoute = typeof deleteById;
export type ListPostTagsRoute = typeof listPostTags;
export type AddPostTagRoute = typeof addPostTag;
export type RemovePostTagRoute = typeof removePostTag;
