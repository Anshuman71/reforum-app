import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { categories } from '@/server/db/schema';
import {
  commonInsertOmitFields,
  getIdParamsSchema,
} from '@/server/common/constants';
import { authMiddleware } from '@/server/common/middlewares';
import { openApiErrorResponses } from '@/server/errors';

const IdParamsSchema = getIdParamsSchema('category');

export const categoriesSelectSchema = createSelectSchema(categories);

const categoriesCreateSchema = createInsertSchema(categories).omit({
  ...commonInsertOmitFields,
});

const categoriesUpdateSchema = createInsertSchema(categories).pick({
  name: true,
  description: true,
  isPrivate: true,
});

const API_TAG = ['Categories'];

export const create = createRoute({
  path: '/',
  method: 'post',
  tags: API_TAG,
  summary: 'Create a categories',
  description: 'Create a categories',
  middleware: [authMiddleware],

  request: {
    body: jsonContentRequired(categoriesCreateSchema, 'The category to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      categoriesSelectSchema,
      'The created categories'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(categoriesSelectSchema),
      'The validation error(s)'
    ),
    ...openApiErrorResponses,
  },
});

export const list = createRoute({
  path: '/',
  method: 'get',
  tags: API_TAG,
  summary: 'List categories',
  description: 'List of all categories',
  middleware: [authMiddleware],
  request: {
    query: z.object({
      limit: z.string().optional(),
      offset: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(categoriesSelectSchema),
      'The requested categories'
    ),
    ...openApiErrorResponses,
  },
});

export const getById = createRoute({
  path: '/:id',
  method: 'get',
  tags: API_TAG,
  summary: 'Get a categories',
  description: 'Get a categories',
  middleware: [authMiddleware],

  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      categoriesSelectSchema,
      'The requested categories'
    ),
    ...openApiErrorResponses,
  },
});

export const updateById = createRoute({
  path: '/:id',
  method: 'patch',
  tags: API_TAG,
  summary: 'Update a categories',
  description: 'Update a categories',
  middleware: [authMiddleware],

  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(categoriesUpdateSchema, 'The updated categories'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      categoriesSelectSchema,
      'The updated categories'
    ),
    ...openApiErrorResponses,
  },
});

export const deleteById = createRoute({
  path: '/:id',
  method: 'delete',
  summary: 'Delete a categories',
  description: 'Delete a categories',
  middleware: [authMiddleware],

  request: {
    params: IdParamsSchema,
  },
  tags: API_TAG,
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: 'Item deleted',
    },
    ...openApiErrorResponses,
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      'Invalid id error'
    ),
  },
});

export type CreateRoute = typeof create;
export type ListRoute = typeof list;
export type GetRoute = typeof getById;
export type UpdateRoute = typeof updateById;
export type DeleteRoute = typeof deleteById;
