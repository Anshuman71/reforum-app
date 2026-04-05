import { createRouter } from '@/server/common/create-app';

import * as handlers from './posts.handlers';
import * as routes from './posts.routes';

export const postsRouter = createRouter()
  .basePath('/posts')
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.listComments, handlers.listComments)
  .openapi(routes.updateById, handlers.update)
  .openapi(routes.deleteById, handlers.remove)
  .openapi(routes.listPostTags, handlers.listPostTags)
  .openapi(routes.addPostTag, handlers.addPostTag)
  .openapi(routes.removePostTag, handlers.removePostTag);
