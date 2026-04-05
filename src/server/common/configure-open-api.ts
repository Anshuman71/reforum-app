import { Scalar } from '@scalar/hono-api-reference';

import { OpenAPIHono } from '@hono/zod-openapi';
import { AuthedVariables } from '@/types';

export default function configureOpenAPI(
  app: OpenAPIHono<{ Variables: AuthedVariables }>
) {
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      version: '1',
      title: 'Reforum: API Reference',
    },
  });

  app.get(
    '/reference',
    Scalar({
      url: '/api/doc',
      theme: 'kepler',
      baseServerURL: '/api',
      pageTitle: 'Reforum: API Reference',
      title: 'Reforum: API Reference',
    })
  );
}
