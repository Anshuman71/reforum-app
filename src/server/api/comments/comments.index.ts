import { createRouter } from '@/server/common/create-app';

import * as handlers from './comments.handlers';
import * as routes from './comments.routes';

export const commentsRouter = createRouter()
  .basePath('/comments')
  .openapi(routes.create, handlers.create)
  .openapi(routes.getById, handlers.get)
  .openapi(routes.updateById, handlers.update)
  .openapi(routes.deleteById, handlers.remove);
