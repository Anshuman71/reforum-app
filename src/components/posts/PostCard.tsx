'use client';

import { CalendarDays, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import { InferResponseType } from 'hono';
import { client } from '@/app/client-utils/react-query';
import BoaringAvatar from 'boring-avatars';

interface Author {
  id: string;
  name: string;
  image?: string | null;
}

interface PostCardProps {
  post: InferResponseType<typeof client.posts.$get, 200>['items'][number];
  author: Author;
  commentsCount: number;
}

function formatPostDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function PostCard({ post, author, commentsCount }: PostCardProps) {
  const postedAt = formatPostDate(post.createdAt);

  return (
    <Card className="group py-0 transition-colors hover:border-primary/40 hover:bg-muted/30">
      <Link
        href={`/d/${post.id}/${post.slug}`}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <CardContent className="p-4 sm:p-5">
          <article className="flex min-w-0 gap-3 sm:gap-4">
            <Avatar className="mt-0.5 h-10 w-10 shrink-0">
              <AvatarImage src={author.image ?? undefined} alt={author.name} />
              <AvatarFallback>
                <BoaringAvatar variant="marble" name={author.id} size={32} />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="max-w-48 truncate font-medium text-foreground">
                  {author.name}
                </span>
                <span aria-hidden="true">/</span>
                <time
                  dateTime={new Date(post.createdAt).toISOString()}
                  className="inline-flex items-center gap-1"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {postedAt}
                </time>
                <Badge variant="secondary" className="h-5 rounded-sm px-1.5 text-[11px]">
                  {post.category.name}
                </Badge>
              </div>

              <h3 className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary sm:text-lg">
                {post.title}
              </h3>
            </div>

            <div
              className="ml-auto hidden shrink-0 items-center gap-1.5 self-center text-sm text-muted-foreground sm:flex"
              aria-label={`${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}`}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="tabular-nums">{commentsCount}</span>
            </div>
          </article>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground sm:hidden">
            <MessageCircle className="h-4 w-4" />
            <span>
              {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
