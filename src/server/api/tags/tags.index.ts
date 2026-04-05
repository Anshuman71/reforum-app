import { createRouter } from '@/server/common/create-app';

import * as handlers from './tags.handlers';
import * as routes from './tags.routes';

export const tagsRouter = createRouter()
  .basePath('/tags')
  .openapi(routes.list, handlers.list)
  .openapi(routes.getById, handlers.get)
  .openapi(routes.updateById, handlers.update)
  .openapi(routes.create, handlers.create)
  .openapi(routes.deleteById, handlers.deleteById)
  .openapi(routes.listTagPosts, handlers.listTagPosts);
