import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { openApiErrorResponses } from '@/server/errors';

const tags = ['Admin'];

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.string(),
});

const UpdateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['user', 'moderator', 'admin']),
});

export const listUsers = createRoute({
  path: '/users',
  method: 'get',
  summary: 'List all users (admin only)',
  tags,
  request: {
    query: z.object({
      search: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(UserSchema),
      'The list of users'
    ),
    ...openApiErrorResponses,
  },
});

export const updateUserRole = createRoute({
  path: '/users/role',
  method: 'patch',
  summary: 'Update a user role (admin only)',
  tags,
  request: {
    body: jsonContentRequired(UpdateRoleSchema, 'The role update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ success: z.boolean() }),
      'Role updated'
    ),
    ...openApiErrorResponses,
  },
});

export type ListUsersRoute = typeof listUsers;
export type UpdateUserRoleRoute = typeof updateUserRole;
