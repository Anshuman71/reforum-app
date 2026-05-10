import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';
import { authMiddleware } from '@/server/common/middlewares';
import { createIdValidator } from '@/server/common/constants';
import { openApiErrorResponses } from '@/server/errors';

const tags = ['Uploads'];

const UploadTargetSchema = z.object({
  strategy: z.enum(['presigned', 'server']),
  uploadUrl: z.string(),
  method: z.enum(['PUT', 'POST']),
  headers: z.record(z.string(), z.string()).optional(),
  publicUrl: z.string(),
  storagePath: z.string(),
});

const PrepareAvatarUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().positive().max(5 * 1024 * 1024),
});

const CompleteAvatarUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().positive().max(5 * 1024 * 1024),
  storagePath: z.string().min(1),
});

const AvatarUploadCompletedSchema = z.object({
  uploadId: createIdValidator('upload'),
  imageUrl: z.string(),
  storagePath: z.string(),
});

const PrepareContentImageUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().positive().max(5 * 1024 * 1024),
});

const CompleteContentImageUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().positive().max(5 * 1024 * 1024),
  storagePath: z.string().min(1),
});

const ContentImageUploadCompletedSchema = z.object({
  uploadId: createIdValidator('upload'),
  imageUrl: z.string(),
  storagePath: z.string(),
});

export const prepareAvatarUpload = createRoute({
  path: '/avatar/prepare',
  method: 'post',
  tags,
  summary: 'Prepare an avatar upload',
  middleware: [authMiddleware],
  request: {
    body: jsonContentRequired(
      PrepareAvatarUploadSchema,
      'Avatar file metadata'
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      UploadTargetSchema,
      'Prepared upload target'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PrepareAvatarUploadSchema),
      'The validation error(s)'
    ),
    ...openApiErrorResponses,
  },
});

export const completeAvatarUpload = createRoute({
  path: '/avatar/complete',
  method: 'post',
  tags,
  summary: 'Finalize an uploaded avatar',
  middleware: [authMiddleware],
  request: {
    body: jsonContentRequired(
      CompleteAvatarUploadSchema,
      'Uploaded avatar metadata'
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      AvatarUploadCompletedSchema,
      'Stored avatar metadata'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(CompleteAvatarUploadSchema),
      'The validation error(s)'
    ),
    ...openApiErrorResponses,
  },
});

export const prepareContentImageUpload = createRoute({
  path: '/content/prepare',
  method: 'post',
  tags,
  summary: 'Prepare a forum content image upload',
  middleware: [authMiddleware],
  request: {
    body: jsonContentRequired(
      PrepareContentImageUploadSchema,
      'Forum content image metadata'
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      UploadTargetSchema,
      'Prepared upload target'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(PrepareContentImageUploadSchema),
      'The validation error(s)'
    ),
    ...openApiErrorResponses,
  },
});

export const completeContentImageUpload = createRoute({
  path: '/content/complete',
  method: 'post',
  tags,
  summary: 'Finalize an uploaded forum content image',
  middleware: [authMiddleware],
  request: {
    body: jsonContentRequired(
      CompleteContentImageUploadSchema,
      'Uploaded forum content image metadata'
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      ContentImageUploadCompletedSchema,
      'Stored forum content image metadata'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(CompleteContentImageUploadSchema),
      'The validation error(s)'
    ),
    ...openApiErrorResponses,
  },
});

export type PrepareAvatarUploadRoute = typeof prepareAvatarUpload;
export type CompleteAvatarUploadRoute = typeof completeAvatarUpload;
export type PrepareContentImageUploadRoute = typeof prepareContentImageUpload;
export type CompleteContentImageUploadRoute = typeof completeContentImageUpload;
