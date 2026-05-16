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
  role: z.string().min(1),
});

const RolePermissionSchema = z.object({
  resource: z.string().min(1),
  action: z.string().min(1),
});

const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isSystem: z.boolean(),
  permissions: z.array(RolePermissionSchema),
});

const CreateRoleSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  permissions: z.array(RolePermissionSchema),
});

const UpdateCustomRoleSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(240).optional(),
  permissions: z.array(RolePermissionSchema).optional(),
});

const RoleParamsSchema = z.object({
  id: z.string().min(1),
});

const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  userIds: z.array(z.string()),
  memberCount: z.number(),
});

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  userIds: z.array(z.string()).optional(),
});

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(240).optional(),
  userIds: z.array(z.string()).optional(),
});

const GroupParamsSchema = z.object({
  id: z.string().min(1),
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

export const listRoles = createRoute({
  path: '/roles',
  method: 'get',
  summary: 'List roles (admin only)',
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(RoleSchema),
      'The list of roles'
    ),
    ...openApiErrorResponses,
  },
});

export const listPermissions = createRoute({
  path: '/roles/permissions',
  method: 'get',
  summary: 'List available permissions (admin only)',
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(RolePermissionSchema),
      'The list of available permissions'
    ),
    ...openApiErrorResponses,
  },
});

export const createRole = createRoute({
  path: '/roles',
  method: 'post',
  summary: 'Create a custom role (admin only)',
  tags,
  request: {
    body: jsonContentRequired(CreateRoleSchema, 'The role to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(RoleSchema, 'The created role'),
    ...openApiErrorResponses,
  },
});

export const updateRole = createRoute({
  path: '/roles/:id',
  method: 'patch',
  summary: 'Update a custom role (admin only)',
  tags,
  request: {
    params: RoleParamsSchema,
    body: jsonContentRequired(UpdateCustomRoleSchema, 'The role update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RoleSchema, 'The updated role'),
    ...openApiErrorResponses,
  },
});

export const deleteRole = createRoute({
  path: '/roles/:id',
  method: 'delete',
  summary: 'Delete a custom role (admin only)',
  tags,
  request: {
    params: RoleParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: 'Role deleted',
    },
    ...openApiErrorResponses,
  },
});

export const listGroups = createRoute({
  path: '/groups',
  method: 'get',
  summary: 'List groups (admin only)',
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(GroupSchema),
      'The list of groups'
    ),
    ...openApiErrorResponses,
  },
});

export const createGroup = createRoute({
  path: '/groups',
  method: 'post',
  summary: 'Create a group (admin only)',
  tags,
  request: {
    body: jsonContentRequired(CreateGroupSchema, 'The group to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(GroupSchema, 'The created group'),
    ...openApiErrorResponses,
  },
});

export const updateGroup = createRoute({
  path: '/groups/:id',
  method: 'patch',
  summary: 'Update a group (admin only)',
  tags,
  request: {
    params: GroupParamsSchema,
    body: jsonContentRequired(UpdateGroupSchema, 'The group update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(GroupSchema, 'The updated group'),
    ...openApiErrorResponses,
  },
});

export const deleteGroup = createRoute({
  path: '/groups/:id',
  method: 'delete',
  summary: 'Delete a group (admin only)',
  tags,
  request: {
    params: GroupParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: 'Group deleted',
    },
    ...openApiErrorResponses,
  },
});

export type ListUsersRoute = typeof listUsers;
export type UpdateUserRoleRoute = typeof updateUserRole;
export type ListRolesRoute = typeof listRoles;
export type ListPermissionsRoute = typeof listPermissions;
export type CreateRoleRoute = typeof createRole;
export type UpdateRoleRoute = typeof updateRole;
export type DeleteRoleRoute = typeof deleteRole;
export type ListGroupsRoute = typeof listGroups;
export type CreateGroupRoute = typeof createGroup;
export type UpdateGroupRoute = typeof updateGroup;
export type DeleteGroupRoute = typeof deleteGroup;
