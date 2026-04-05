import type { AppRouteHandler } from '@/types';

import { db } from '@/server/db';
import {
  CreateRoute,
  DeleteByIdRoute,
  ListCommentsRoute,
  ListRoute,
  UpdateByIdRoute,
  ListPostTagsRoute,
  AddPostTagRoute,
  RemovePostTagRoute,
} from './posts.routes';
import {
  comments,
  posts,
  postTags,
  tags as tagsTable,
} from '@/server/db/schema';
import { newId } from '@/server/lib/id';
import { and, eq } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as HttpStatusPhrases from 'stoker/http-status-phrases';
import slugify from 'slugify';
import { ReforumApiError } from '@/server/errors';

function slugifyPost<P extends { title: string }>(p: P): P & { slug: string } {
  return {
    ...p,
    slug: slugify(p.title, { lower: true }),
  };
}

export const list: AppRouteHandler<ListRoute> = async c => {
  const queries = c.req.valid('query');
  const user = c.get('user');
  console.log({ user });
  const postsRes = await db.query.posts.findMany({
    limit: Number(queries.limit ?? 20),
  });
  return c.json(
    postsRes.map(p => slugifyPost(p)),
    HttpStatusCodes.OK
  );
};

export const create: AppRouteHandler<CreateRoute> = async c => {
  const data = c.req.valid('json');
  const user = c.get('user');
  console.log({ user });

  const postId = newId('post');

  await db.insert(posts).values({
    id: postId,
    title: data.title,
    slug: slugify(data.title, { lower: true, strict: true }),
    authorId: data.authorId,
    categoryId: data.categoryId,
  });

  await db.insert(comments).values({
    id: newId('comment'),
    postId: postId,
    authorId: data.authorId,
    content: data.content,
  });

  if (data.tags.length) {
    await db.insert(postTags).values(
      data.tags.map(tag => ({
        id: newId('post_tag'),
        postId: postId,
        tagId: tag,
      }))
    );
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    return c.json(
      {
        message: HttpStatusPhrases.UNPROCESSABLE_ENTITY,
      },
      HttpStatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  return c.json(slugifyPost(post), HttpStatusCodes.CREATED);
};

export const listComments: AppRouteHandler<ListCommentsRoute> = async c => {
  const id = c.req.param('id');
  const commentsRes = await db.query.comments.findMany({
    where: eq(comments.postId, id),
  });

  return c.json(commentsRes, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateByIdRoute> = async c => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const updatedPost: { title?: string; categoryId?: string } = {};

  if (data.title) {
    updatedPost.title = data.title;
  }

  if (data.categoryId) {
    updatedPost.categoryId = data.categoryId;
  }

  const [post] = await db
    .update(posts)
    .set(updatedPost)
    .where(eq(posts.id, id))
    .returning();

  if (data.tags) {
    await db.delete(postTags).where(eq(postTags.postId, id));
    await db.insert(postTags).values(
      data.tags.map(tag => ({
        id: newId('post_tag'),
        postId: id,
        tagId: tag,
      }))
    );
  }

  return c.json(slugifyPost(post), HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<DeleteByIdRoute> = async c => {
  const id = c.req.param('id');
  const result = await db
    .update(posts)
    .set({ state: 'deleted' })
    .where(eq(posts.id, id));

  if (!result) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND
    );
  }
  return c.json(result, HttpStatusCodes.OK);
};

// PostTags handlers
export const listPostTags: AppRouteHandler<ListPostTagsRoute> = async c => {
  const { id: postId } = c.req.valid('param');
  const queries = c.req.valid('query');

  // Check if post exists
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  const postTagsList = await db.query.postTags.findMany({
    where: eq(postTags.postId, postId),
    with: {
      tag: true,
    },
    limit: Number(queries.limit ?? 20),
    offset: Number(queries.offset ?? 0),
  });

  return c.json(postTagsList, HttpStatusCodes.OK);
};

export const addPostTag: AppRouteHandler<AddPostTagRoute> = async c => {
  const { id: postId } = c.req.valid('param');
  const { tagId } = c.req.valid('json');

  // Check if post exists
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  // Check if tag exists
  const tag = await db.query.tags.findFirst({
    where: eq(tagsTable.id, tagId),
  });

  if (!tag) {
    throw new ReforumApiError({
      message: 'Tag not found',
      code: 'NOT_FOUND',
    });
  }

  // Check if relationship already exists
  const existingRelation = await db.query.postTags.findFirst({
    where: and(eq(postTags.postId, postId), eq(postTags.tagId, tagId)),
  });

  if (existingRelation) {
    throw new ReforumApiError({
      message: 'Tag already associated with post',
      code: 'CONFLICT',
    });
  }

  const postTagId = newId('post_tag');

  await db.insert(postTags).values({
    id: postTagId,
    postId,
    tagId,
  });

  // Fetch the created relationship with tag details
  const postTagWithTag = await db.query.postTags.findFirst({
    where: eq(postTags.id, postTagId),
    with: {
      tag: true,
    },
  });

  return c.json(postTagWithTag, HttpStatusCodes.CREATED);
};

export const removePostTag: AppRouteHandler<RemovePostTagRoute> = async c => {
  const { postId, tagId } = c.req.valid('param');

  // Check if post exists
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    throw new ReforumApiError({
      message: 'Post not found',
      code: 'NOT_FOUND',
    });
  }

  const result = await db
    .delete(postTags)
    .where(and(eq(postTags.postId, postId), eq(postTags.tagId, tagId)));

  if (result.count === 0) {
    throw new ReforumApiError({
      message: 'Post tag relationship not found',
      code: 'NOT_FOUND',
    });
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
