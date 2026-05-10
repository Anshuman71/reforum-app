import { createRouter } from '@/server/common/create-app';
import * as handlers from './uploads.handlers';
import * as routes from './uploads.routes';

export const uploadsRouter = createRouter()
  .basePath('/uploads')
  .openapi(routes.prepareAvatarUpload, handlers.prepareAvatarUpload)
  .openapi(routes.completeAvatarUpload, handlers.completeAvatarUpload)
  .openapi(routes.prepareContentImageUpload, handlers.prepareContentImageUpload)
  .openapi(routes.completeContentImageUpload, handlers.completeContentImageUpload)
  .post('/local', handlers.uploadLocal);
