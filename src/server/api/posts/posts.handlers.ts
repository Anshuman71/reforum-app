import type { AppRouteHandler } from '@/types';

import { db } from '@/server/db';
import {
  CreateRoute,
  DeleteByIdRoute,
  GetRoute,
  ListCommentsRoute,
  ListRoute,
  UpdateByIdRoute,
  ListPostTagsRoute,
  AddPostTagRoute,
  RemovePostTagRoute,
} from './posts.routes';
import { posts, postTags, tags as tagsTable } from '@/server/db/schema';
import { newId } from '@/server/lib/id';
import { and, eq } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { ReforumApiError } from '@/server/errors';
import {
  createPost,
  deletePost,
  getThread,
  listPosts,
  listThreadComments,
  updatePost,
} from '@/server/services/forum';

export const list: AppRouteHandler<ListRoute> = async c => {
  const queries = c.req.valid('query');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const page = await listPosts({
    actor,
    limit: queries.limit,
    cursor: queries.cursor,
  });

  return c.json(page, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async c => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const post = await createPost({
    actor,
    title: data.title,
    contentJson: data.contentJson,
    contentHtml: data.contentHtml,
    categoryId: data.categoryId,
    tags: data.tags,
  });

  return c.json(post, HttpStatusCodes.CREATED);
};

export const get: AppRouteHandler<GetRoute> = async c => {
  const { id } = c.req.valid('param');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const thread = await getThread(id, actor);

  return c.json(thread, HttpStatusCodes.OK);
};

export const listComments: AppRouteHandler<ListCommentsRoute> = async c => {
  const { id } = c.req.valid('param');
  const queries = c.req.valid('query');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const page = await listThreadComments({
    postId: id,
    actor,
    limit: queries.limit,
    cursor: queries.cursor,
  });

  return c.json(page, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateByIdRoute> = async c => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  const post = await updatePost({
    id,
    actor,
    title: data.title,
    categoryId: data.categoryId,
    tags: data.tags,
  });

  return c.json(post, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<DeleteByIdRoute> = async c => {
  const { id } = c.req.valid('param');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : null;

  await deletePost({ id, actor });

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const listPostTags: AppRouteHandler<ListPostTagsRoute> = async c => {
  const { id: postId } = c.req.valid('param');
  const queries = c.req.valid('query');

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    throw new ReforumApiError({
      message: 'Post not found',
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

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    throw new ReforumApiError({
      message: 'Post not found',
      code: 'NOT_FOUND',
    });
  }

  const tag = await db.query.tags.findFirst({
    where: eq(tagsTable.id, tagId),
  });

  if (!tag) {
    throw new ReforumApiError({
      message: 'Tag not found',
      code: 'NOT_FOUND',
    });
  }

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
