import { createRouter } from '@/server/common/create-app';
import * as handlers from './admin.handlers';
import * as routes from './admin.routes';

export const adminRouter = createRouter()
  .basePath('/admin')
  .openapi(routes.listUsers, handlers.listUsers)
  .openapi(routes.updateUserRole, handlers.updateUserRole)
  .openapi(routes.listRoles, handlers.listRoles)
  .openapi(routes.listPermissions, handlers.listPermissions)
  .openapi(routes.createRole, handlers.createRole)
  .openapi(routes.updateRole, handlers.updateRole)
  .openapi(routes.deleteRole, handlers.deleteRole)
  .openapi(routes.listGroups, handlers.listGroups)
  .openapi(routes.createGroup, handlers.createGroup)
  .openapi(routes.updateGroup, handlers.updateGroup)
  .openapi(routes.deleteGroup, handlers.deleteGroup);
