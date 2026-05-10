import { PostsPageClient } from '@/components/posts/PostsClient';
import { CreatePostModal } from '@/components/posts/CreatePostModal';
import { PostsList } from '@/components/posts/PostsList';

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getPosts, QUERY_KEYS } from '@/app/client-utils/react-query';
import { getQueryClient } from '@/app/client-utils/get-query-client';
import { headers } from 'next/headers';
import { Suspense } from 'react';

async function PrefetchedPosts() {
  const fwHeaders = await headers();
  const queryClient = getQueryClient();

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.posts],
      queryFn: () =>
        getPosts({
          headers: { cookie: fwHeaders.get('cookie') ?? '' },
        }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsPageClient />
    </HydrationBoundary>
  );
}

export default function PostsPage() {
  return (
    <>
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
      <Suspense fallback={<PostsList posts={[]} loading />}>
        <PrefetchedPosts />
      </Suspense>
    </>
  );
}
