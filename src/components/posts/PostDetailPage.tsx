'use client';

import { useQuery } from '@tanstack/react-query';

import { getPostComments, QUERY_KEYS } from '@/app/client-utils/react-query';
import { useParams } from 'next/navigation';

export function PostDetailsClient() {
  const { slug } = useParams();

  const postId = slug?.[1] ?? '';

  const { data } = useQuery({
    queryKey: [QUERY_KEYS.postComments, postId],
    queryFn: () => getPostComments(postId),
  });

  if (!data) return <div>Loading...</div>;

  return <div>Hello frands</div>;
}
