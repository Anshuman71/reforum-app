import { createRouter } from '@/server/common/create-app';
import * as handlers from './moderation.handlers';
import * as routes from './moderation.routes';

export const moderationRouter = createRouter()
  .basePath('/moderation')
  .openapi(routes.createFlag, handlers.create)
  .openapi(routes.listFlags, handlers.list)
  .openapi(routes.reviewFlag, handlers.review);
