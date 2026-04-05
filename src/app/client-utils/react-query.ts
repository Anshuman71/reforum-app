import { hc } from 'hono/client';
import { AppType } from '@/app/api/[[...route]]/route';
import { InferErrorResponse, InferSuccessResponse } from '@/types';

export const client = hc<AppType>(
  // eslint-disable-next-line n/no-process-env
  `${String(process.env.NEXT_PUBLIC_BETTER_AUTH_URL)}/api`
);

export async function getPosts(forwardedHeaders?: Record<string, string>) {
  const res = await client.posts.$get(
    { query: {} },
    { headers: { ...forwardedHeaders } }
  );

  type GetPosts = typeof client.posts.$get;
  type PostsResponse = InferSuccessResponse<GetPosts>;

  const data = await res.json();
  if (!res.ok) {
    const erroredData = data as InferErrorResponse<GetPosts>;
    throw new Error(erroredData.error.message);
  }
  return data as PostsResponse;
}

export async function getPostComments(id: string) {
  const res = await client.posts[':id'].comments.$get({
    param: { id },
    query: {},
  });
  return await res.json();
}

export const QUERY_KEYS = {
  posts: 'posts',
  postComments: 'post-comments',
} as const;
