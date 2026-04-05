import { createRouter } from '@/server/common/create-app';

import * as handlers from './categories.handlers';
import * as routes from './categories.routes';

export const categoriesRouter = createRouter()
  .basePath('/categories')
  .openapi(routes.getById, handlers.get)
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.updateById, handlers.update)
  .openapi(routes.deleteById, handlers.remove);
