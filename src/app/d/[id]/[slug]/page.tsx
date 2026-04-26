import { getQueryClient } from '@/app/client-utils/get-query-client';
import {
  getThread,
  getThreadComments,
  QUERY_KEYS,
} from '@/app/client-utils/react-query';
import { PostDetailsClient } from '@/components/posts/PostDetailPage';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function PostDetailsPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id: postId } = await params;

  if (!postId) {
    return notFound();
  }

  const queryClient = getQueryClient();
  const fwHeaders = await headers();
  const cookie = fwHeaders.get('cookie') ?? '';

  void queryClient.prefetchQuery({
    queryKey: [QUERY_KEYS.thread, postId],
    queryFn: () => getThread(postId, { cookie }),
  });

  void queryClient.prefetchInfiniteQuery({
    queryKey: [QUERY_KEYS.threadComments, postId],
    queryFn: ({ pageParam }) =>
      getThreadComments(postId, {
        cursor: typeof pageParam === 'string' ? pageParam : undefined,
        headers: { cookie },
      }),
    initialPageParam: undefined as string | undefined,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostDetailsClient />
    </HydrationBoundary>
  );
}
