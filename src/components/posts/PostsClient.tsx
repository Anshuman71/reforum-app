'use client';

import { useQuery } from '@tanstack/react-query';
import { PostsList } from './PostsList';
import { getPosts, QUERY_KEYS } from '@/app/client-utils/react-query';

export function PostsPageClient() {
  const { data, error } = useQuery({
    queryKey: [QUERY_KEYS.posts],
    queryFn: () => getPosts(),
  });

  if (!data) return <div>Loading...</div>;

  if (error) return <div>{error.message}</div>;

  return <PostsList posts={data} />;
}
