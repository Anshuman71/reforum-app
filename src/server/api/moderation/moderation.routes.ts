import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createSelectSchema } from 'drizzle-zod';
import { flags } from '@/server/db/schema';
import { createIdValidator, getIdParamsSchema } from '@/server/common/constants';
import { authMiddleware } from '@/server/common/middlewares';
import { openApiErrorResponses } from '@/server/errors';

const API_TAG = ['Moderation'];
const FlagSelectSchema = createSelectSchema(flags);
const FlagIdParamsSchema = getIdParamsSchema('flag');

const FlagTargetTypeSchema = z.enum(['post', 'comment']);
const FlagReasonSchema = z.enum(['spam', 'offensive', 'off-topic', 'other']);
const FlagStatusSchema = z.enum(['pending', 'accepted', 'rejected']);

const CreateFlagSchema = z.object({
  targetType: FlagTargetTypeSchema,
  targetId: z.union([createIdValidator('post'), createIdValidator('comment')]),
  reason: FlagReasonSchema,
  details: z.string().max(5000).optional().nullable(),
});

const ReviewFlagSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  contentAction: z.enum(['none', 'hide', 'delete', 'restore']).optional().default('none'),
});

export const createFlag = createRoute({
  path: '/flags',
  method: 'post',
  tags: API_TAG,
  summary: 'Submit a content flag',
  middleware: [authMiddleware],
  request: {
    body: jsonContentRequired(CreateFlagSchema, 'The flag to submit'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(FlagSelectSchema, 'The created flag'),
    ...openApiErrorResponses,
  },
});

export const listFlags = createRoute({
  path: '/flags',
  method: 'get',
  tags: API_TAG,
  summary: 'List moderation flags',
  middleware: [authMiddleware],
  request: {
    query: z.object({
      status: FlagStatusSchema.optional(),
      limit: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.array(FlagSelectSchema), 'The moderation queue'),
    ...openApiErrorResponses,
  },
});

export const reviewFlag = createRoute({
  path: '/flags/:id/review',
  method: 'post',
  tags: API_TAG,
  summary: 'Review a moderation flag',
  middleware: [authMiddleware],
  request: {
    params: FlagIdParamsSchema,
    body: jsonContentRequired(ReviewFlagSchema, 'The moderation decision'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(FlagSelectSchema, 'The reviewed flag'),
    ...openApiErrorResponses,
  },
});

export type CreateFlagRoute = typeof createFlag;
export type ListFlagsRoute = typeof listFlags;
export type ReviewFlagRoute = typeof reviewFlag;
