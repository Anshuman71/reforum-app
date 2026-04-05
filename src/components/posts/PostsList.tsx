'use client';

import { client } from '@/app/client-utils/react-query';
import { PostCard } from './PostCard';
import { InferResponseType } from 'hono/client';

interface PostsListProps {
  posts: InferResponseType<typeof client.posts.$get, 200>;
  loading?: boolean;
}

export function PostsList({ posts, loading = false }: PostsListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-6 animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 bg-muted rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded w-1/6" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-2">No posts yet</div>
        <p className="text-sm text-muted-foreground">
          Be the first to start a conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(postData => (
        <PostCard
          key={postData.id}
          post={postData}
          author={{ id: postData.authorId, name: 'pikachu' }}
          commentsCount={44}
        />
      ))}
    </div>
  );
}
