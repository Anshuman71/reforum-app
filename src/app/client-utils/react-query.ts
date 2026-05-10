import { hc } from 'hono/client';
import { AppType } from '@/app/api/[[...route]]/route';
import { InferErrorResponse, InferSuccessResponse } from '@/types';

export const client = hc<AppType>(
  // eslint-disable-next-line n/no-process-env
  `${String(process.env.NEXT_PUBLIC_BETTER_AUTH_URL)}/api`
);

type RequestHeaders = Record<string, string>;

async function parseResponse(res: Response) {
  const text = await res.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, fallback: string) {
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    data.error &&
    typeof data.error === 'object' &&
    'message' in data.error &&
    typeof data.error.message === 'string'
  ) {
    return data.error.message;
  }

  if (typeof data === 'string' && data.trim().length > 0) {
    return data;
  }

  return fallback;
}

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

  const data = await parseResponse(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(data, 'Failed to load posts'));
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

  const data = await parseResponse(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(data, 'Failed to load thread'));
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

  const data = await parseResponse(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(data, 'Failed to load thread comments'));
  }

  return data as ThreadCommentsResponse;
}

export const QUERY_KEYS = {
  posts: 'posts',
  thread: 'thread',
  threadComments: 'thread-comments',
} as const;
