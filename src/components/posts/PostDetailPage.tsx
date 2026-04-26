'use client';

import { FormEvent, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { MessageCircle, Send } from 'lucide-react';
import BoaringAvatar from 'boring-avatars';
import { client, getThread, getThreadComments, QUERY_KEYS } from '@/app/client-utils/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/lib/auth-client';

function AuthorAvatar(props: {
  id: string;
  name: string;
  image: string | null;
}) {
  return (
    <Avatar className="h-10 w-10">
      <AvatarImage src={props.image ?? undefined} alt={props.name} />
      <AvatarFallback>
        <BoaringAvatar variant="marble" name={props.id} size={32} />
      </AvatarFallback>
    </Avatar>
  );
}

export function PostDetailsClient() {
  const params = useParams<{ id: string; slug: string }>();
  const postId = params.id;
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [comment, setComment] = useState('');

  const threadQuery = useQuery({
    queryKey: [QUERY_KEYS.thread, postId],
    queryFn: () => getThread(postId),
    enabled: Boolean(postId),
  });

  const commentsQuery = useInfiniteQuery({
    queryKey: [QUERY_KEYS.threadComments, postId],
    queryFn: ({ pageParam }) =>
      getThreadComments(postId, {
        cursor: typeof pageParam === 'string' ? pageParam : undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    enabled: Boolean(postId),
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await client.comments.$post({
        json: {
          postId,
          content,
          replyToCommentId: null,
        },
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error((payload as any)?.error?.message ?? 'Failed to create comment');
      }

      return payload;
    },
    onSuccess: async () => {
      setComment('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.thread, postId] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.threadComments, postId] }),
      ]);
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!comment.trim()) return;
    await createCommentMutation.mutateAsync(comment.trim());
  };

  if (threadQuery.isLoading || commentsQuery.isLoading) {
    return <div>Loading thread...</div>;
  }

  if (threadQuery.error) {
    return <div>{threadQuery.error.message}</div>;
  }

  if (commentsQuery.error) {
    return <div>{commentsQuery.error.message}</div>;
  }

  const thread = threadQuery.data;
  if (!thread) {
    return <div>Thread not found.</div>;
  }

  const replies = commentsQuery.data?.pages.flatMap(page => page.items) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-start gap-3">
            <AuthorAvatar
              id={thread.author.id}
              name={thread.author.name}
              image={thread.author.image}
            />
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-2xl">{thread.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Started by {thread.author.name} in {thread.category.name}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {thread.body ? (
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-3">
                <AuthorAvatar
                  id={thread.body.author.id}
                  name={thread.body.author.name}
                  image={thread.body.author.image}
                />
                <div>
                  <p className="font-medium">{thread.body.author.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(thread.body.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6">
                {thread.body.content}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">This thread has no body yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <CardTitle className="text-lg">
              Replies ({thread.repliesCount})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {session?.user ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                value={comment}
                onChange={event => setComment(event.target.value)}
                placeholder="Write a reply..."
                rows={4}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={createCommentMutation.isPending || !comment.trim()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {createCommentMutation.isPending ? 'Posting...' : 'Post Reply'}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in to join the conversation.
            </p>
          )}

          {replies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No replies yet. Start the conversation.
            </p>
          ) : (
            <div className="space-y-3">
              {replies.map(reply => (
                <div key={reply.id} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <AuthorAvatar
                      id={reply.author.id}
                      name={reply.author.name}
                      image={reply.author.image}
                    />
                    <div>
                      <p className="font-medium">{reply.author.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(reply.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {reply.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {commentsQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => commentsQuery.fetchNextPage()}
                disabled={commentsQuery.isFetchingNextPage}
              >
                {commentsQuery.isFetchingNextPage ? 'Loading...' : 'Load More Replies'}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
