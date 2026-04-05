import '@/server/features'; // Ensure hooks are registered before any request
import { adminRouter } from '@/server/api/admin/admin.index';
import { categoriesRouter } from '@/server/api/categories/categories.index';
import { commentsRouter } from '@/server/api/comments/comments.index';
import configureOpenAPI from '@/server/common/configure-open-api';
import createApp from '@/server/common/create-app';
import { postsRouter } from '@/server/api/posts/posts.index';
import { tagsRouter } from '@/server/api/tags/tags.index';
import { handle } from 'hono/vercel';

const app = createApp();

const routes = [
  adminRouter,
  postsRouter,
  commentsRouter,
  categoriesRouter,
  tagsRouter,
] as const;

app.get('/ping', c => c.text('Pong!'));

routes.forEach(route => {
  app.route('/', route);
});

configureOpenAPI(app);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = (typeof routes)[number];
