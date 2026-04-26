import { hc } from 'hono/client';
import { AppType } from '@/app/api/[[...route]]/route';
import { InferErrorResponse, InferSuccessResponse } from '@/types';

export const client = hc<AppType>(
  // eslint-disable-next-line n/no-process-env
  `${String(process.env.NEXT_PUBLIC_BETTER_AUTH_URL)}/api`
);

type RequestHeaders = Record<string, string>;

export async function getPosts(input?: {
  cursor?: string;
  limit?: number;
  headers?: RequestHeaders;
}) {
  const res = await client.posts.$get(
    {
      query: {
        ...(input?.cursor ? { cursor: input.cursor } : {}),
        ...(input?.limit ? { limit: String(input.limit) } : {}),
      },
    },
    { headers: { ...(input?.headers ?? {}) } }
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

export async function getThread(postId: string, headers?: RequestHeaders) {
  const res = await client.posts[':id'].$get(
    { param: { id: postId } },
    { headers: { ...(headers ?? {}) } }
  );

  type GetThread = typeof client.posts[':id']['$get'];
  type ThreadResponse = InferSuccessResponse<GetThread>;

  const data = await res.json();
  if (!res.ok) {
    const erroredData = data as InferErrorResponse<GetThread>;
    throw new Error(erroredData.error.message);
  }

  return data as ThreadResponse;
}

export async function getThreadComments(
  postId: string,
  input?: {
    cursor?: string;
    limit?: number;
    headers?: RequestHeaders;
  }
) {
  const res = await client.posts[':id'].comments.$get(
    {
      param: { id: postId },
      query: {
        ...(input?.cursor ? { cursor: input.cursor } : {}),
        ...(input?.limit ? { limit: String(input.limit) } : {}),
      },
    },
    { headers: { ...(input?.headers ?? {}) } }
  );

  type GetThreadComments = typeof client.posts[':id']['comments']['$get'];
  type ThreadCommentsResponse = InferSuccessResponse<GetThreadComments>;

  const data = await res.json();
  if (!res.ok) {
    const erroredData = data as InferErrorResponse<GetThreadComments>;
    throw new Error(erroredData.error.message);
  }

  return data as ThreadCommentsResponse;
}

export const QUERY_KEYS = {
  posts: 'posts',
  thread: 'thread',
  threadComments: 'thread-comments',
} as const;
