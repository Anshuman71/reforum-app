import { OpenAPIHono } from '@hono/zod-openapi';
import { notFound, serveEmojiFavicon } from 'stoker/middlewares';
import { defaultHook } from 'stoker/openapi';
import { requestId } from 'hono/request-id';
import { authMiddleware } from './middlewares';
import { handleError } from '@/server/errors';
import { AuthedVariables } from '@/types';

export function createRouter() {
  return new OpenAPIHono<{ Variables: AuthedVariables }>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const app = createRouter().basePath('/api');
  app.use(requestId()).use(serveEmojiFavicon('📝'));
  app.use(authMiddleware);
  app.notFound(notFound);
  app.onError(handleError);
  return app;
}
