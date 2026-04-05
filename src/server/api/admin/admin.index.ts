import { createRouter } from '@/server/common/create-app';
import * as handlers from './admin.handlers';
import * as routes from './admin.routes';

export const adminRouter = createRouter()
  .basePath('/admin')
  .openapi(routes.listUsers, handlers.listUsers)
  .openapi(routes.updateUserRole, handlers.updateUserRole);
