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
import { emitBeforeEvent, emitAfterEvent } from '@/server/lib/events';

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
  const actor = user ? { id: user.id, role: user.role } : null;
  const postsRes = await db.query.posts.findMany({
    limit: Number(queries.limit ?? 20),
  });

  emitAfterEvent('post:afterList', { entities: postsRes, actor, meta: {} });

  return c.json(
    postsRes.map(p => slugifyPost(p)),
    HttpStatusCodes.OK
  );
};

export const create: AppRouteHandler<CreateRoute> = async c => {
  const data = c.req.valid('json');
  const user = c.get('user');
  console.log({ user });
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const ctx = await emitBeforeEvent('post:beforeCreate', {
    data: { title: data.title, content: data.content, authorId: data.authorId, categoryId: data.categoryId, tags: data.tags },
    actor,
    meta: {},
  });

  const postId = newId('post');

  const post = await db.transaction(async (tx) => {
    const [created] = await tx.insert(posts).values({
      id: postId,
      title: ctx.data.title,
      slug: slugify(ctx.data.title, { lower: true, strict: true }),
      authorId: ctx.data.authorId,
      categoryId: ctx.data.categoryId,
    }).returning();

    await tx.insert(comments).values({
      id: newId('comment'),
      postId: postId,
      authorId: ctx.data.authorId,
      content: ctx.data.content,
    });

    if (ctx.data.tags.length) {
      await tx.insert(postTags).values(
        ctx.data.tags.map(tag => ({
          id: newId('post_tag'),
          postId: postId,
          tagId: tag,
        }))
      );
    }

    return created;
  });

  if (!post) {
    return c.json(
      {
        message: HttpStatusPhrases.UNPROCESSABLE_ENTITY,
      },
      HttpStatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  emitAfterEvent('post:afterCreate', { entity: post, actor, meta: {} });

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
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const existing = await db.query.posts.findFirst({
    where: eq(posts.id, id),
  });

  if (!existing) {
    throw new ReforumApiError({
      message: HttpStatusPhrases.NOT_FOUND,
      code: 'NOT_FOUND',
    });
  }

  const ctx = await emitBeforeEvent('post:beforeUpdate', {
    entity: existing,
    data: { title: data.title, categoryId: data.categoryId, tags: data.tags },
    actor,
    meta: {},
  });

  const updatedPost: { title?: string; categoryId?: string } = {};

  if (ctx.data.title) {
    updatedPost.title = ctx.data.title;
  }

  if (ctx.data.categoryId) {
    updatedPost.categoryId = ctx.data.categoryId;
  }

  const [post] = await db
    .update(posts)
    .set(updatedPost)
    .where(eq(posts.id, id))
    .returning();

  if (ctx.data.tags) {
    await db.delete(postTags).where(eq(postTags.postId, id));
    await db.insert(postTags).values(
      ctx.data.tags.map(tag => ({
        id: newId('post_tag'),
        postId: id,
        tagId: tag,
      }))
    );
  }

  emitAfterEvent('post:afterUpdate', { entity: post, actor, meta: {} });

  return c.json(slugifyPost(post), HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<DeleteByIdRoute> = async c => {
  const id = c.req.param('id');
  const user = c.get('user');
  const actor = user ? { id: user.id, role: user.role } : { id: 'system', role: 'system' };

  const existing = await db.query.posts.findFirst({
    where: eq(posts.id, id),
  });

  if (!existing) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND
    );
  }

  await emitBeforeEvent('post:beforeDelete', {
    entity: existing,
    actor,
    meta: {},
  });

  const result = await db
    .update(posts)
    .set({ state: 'deleted' })
    .where(eq(posts.id, id));

  emitAfterEvent('post:afterDelete', { entity: existing, actor, meta: {} });

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
