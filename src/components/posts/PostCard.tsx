'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { InferResponseType } from 'hono';
import { client } from '@/app/client-utils/react-query';
import BoaringAvatar from 'boring-avatars';

interface Author {
  id: string;
  name: string;
  image?: string;
}

interface PostCardProps {
  post: InferResponseType<typeof client.posts.$get, 200>[number];
  author: Author;
  commentsCount: number;
}

export function PostCard({ post, author, commentsCount }: PostCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <Link href={`/d/${post.id}/${post.slug}`} className="block">
        <CardHeader>
          <div className="grid grid-cols-12 items-center space-x-3 flex-1 min-w-0">
            {/* User Avatar */}
            <div className="col-span-1">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={author.image} alt={author.name} />
                <AvatarFallback>
                  <BoaringAvatar variant="marble" name={author.id} size={32} />
                </AvatarFallback>
              </Avatar>
            </div>
            <h3 className="col-span-9 overflow-clip font-semibold text-lg leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>
            <div className="col-span-2 flex items-center space-x-4 text-muted-foreground">
              <div className="flex items-center space-x-1">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">
                  {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Link>
    </Card>
  );
}
