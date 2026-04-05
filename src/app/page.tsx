import { PostsPageClient } from '@/components/posts/PostsClient';
import { CreatePostModal } from '@/components/posts/CreatePostModal';

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getPosts, QUERY_KEYS } from '@/app/client-utils/react-query';
import { getQueryClient } from '@/app/client-utils/get-query-client';
import { headers } from 'next/headers';

export default async function PostsPage() {
  const fwHeaders = await headers();
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery({
    queryKey: [QUERY_KEYS.posts],
    queryFn: () => getPosts({ cookie: fwHeaders.get('cookie') ?? '' }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Community Posts</h1>
            <p className="text-muted-foreground">
              Latest discussions and updates from our community
            </p>
          </div>
          <CreatePostModal />
        </div>
      </div>
      <PostsPageClient />
    </HydrationBoundary>
  );
}
