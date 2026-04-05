import { getQueryClient } from '@/app/client-utils/get-query-client';
import { getPostComments, QUERY_KEYS } from '@/app/client-utils/react-query';
import { PostDetailsClient } from '@/components/posts/PostDetailPage';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

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

  void queryClient.prefetchQuery({
    queryKey: [QUERY_KEYS.postComments, postId],
    queryFn: () => getPostComments(postId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostDetailsClient />
    </HydrationBoundary>
  );
}
