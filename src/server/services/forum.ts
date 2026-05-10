import { and, asc, count, desc, eq, gt, inArray, lt, ne, or } from 'drizzle-orm';
import { db } from '@/server/db';
import { comments, posts, postTags, categories, users } from '@/server/db/schema';
import { newId } from '@/server/lib/id';
import { emitAfterEvent, emitBeforeEvent } from '@/server/lib/events';
import { ReforumApiError } from '@/server/errors';
import type { Actor } from '@/server/lib/event-types';
import slugify from 'slugify';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

type NullableActor = Actor | null;

type PostListCursor = {
  createdAt: string;
  id: string;
};

type CommentListCursor = {
  createdAt: string;
  id: string;
};

export type FeedAuthor = {
  id: string;
  name: string;
  image: string | null;
};

export type FeedCategory = {
  id: string;
  name: string;
  isPrivate: boolean;
};

export type FeedPost = {
  id: string;
  title: string;
  slug: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  pinnedAt: Date | null;
  author: FeedAuthor;
  category: FeedCategory;
  commentsCount: number;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type ThreadBody = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  author: FeedAuthor;
};

export type ThreadReply = {
  id: string;
  contentJson: unknown | null;
  contentHtml: string | null;
  createdAt: Date;
  updatedAt: Date;
  replyToCommentId: string | null;
  author: FeedAuthor;
};

export type ThreadPost = {
  id: string;
  title: string;
  slug: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
  author: FeedAuthor;
  category: FeedCategory;
  contentJson: unknown | null;
  contentHtml: string | null;
  body: ThreadBody | null;
  repliesCount: number;
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasRenderableContent(input: {
  contentJson?: unknown | null;
  contentHtml?: string | null;
}): boolean {
  const htmlText = input.contentHtml ? stripHtml(input.contentHtml) : '';
  if (htmlText.length > 0) {
    return true;
  }

  if (input.contentHtml?.includes('<img')) {
    return true;
  }

  return Boolean(input.contentJson);
}

function unauthorized(message = 'Authentication required'): never {
  throw new ReforumApiError({
    code: 'UNAUTHORIZED',
    message,
  });
}

function forbidden(message = 'Insufficient permissions to perform this action'): never {
  throw new ReforumApiError({
    code: 'FORBIDDEN',
    message,
  });
}

function notFound(message = 'Not found'): never {
  throw new ReforumApiError({
    code: 'NOT_FOUND',
    message,
  });
}

function getPageSize(limit?: number | string): number {
  if (typeof limit === 'number' && Number.isFinite(limit)) {
    return Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
  }

  if (typeof limit === 'string' && limit.length > 0) {
    const parsed = Number(limit);
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(parsed, 1), MAX_PAGE_SIZE);
    }
  }

  return DEFAULT_PAGE_SIZE;
}

function encodeCursor(value: PostListCursor | CommentListCursor): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeCursor<T extends PostListCursor | CommentListCursor>(
  cursor: string | undefined
): T | null {
  if (!cursor) return null;

  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T;
  } catch {
    throw new ReforumApiError({
      code: 'BAD_REQUEST',
      message: 'Invalid cursor',
    });
  }
}

function requireActor(actor: NullableActor): Actor {
  if (!actor) unauthorized();
  return actor;
}

function assertCanManageContent(actor: Actor, authorId: string): void {
  if (actor.role === 'admin' || actor.role === 'moderator' || actor.id === authorId) {
    return;
  }

  forbidden();
}

function buildPostCursorWhere(cursor: PostListCursor | null) {
  if (!cursor) return undefined;

  const createdAt = new Date(cursor.createdAt);
  return or(
    lt(posts.createdAt, createdAt),
    and(eq(posts.createdAt, createdAt), lt(posts.id, cursor.id))
  );
}

function buildCommentCursorWhere(
  postId: string,
  bodyCommentId: string | null,
  cursor: CommentListCursor | null
) {
  const filters = [eq(comments.postId, postId), eq(comments.state, 'active')];

  if (bodyCommentId) {
    filters.push(ne(comments.id, bodyCommentId));
  }

  if (cursor) {
    const createdAt = new Date(cursor.createdAt);
    filters.push(
      or(
        gt(comments.createdAt, createdAt),
        and(eq(comments.createdAt, createdAt), gt(comments.id, cursor.id))
      )!
    );
  }

  return and(...filters);
}

async function getCommentCounts(postIds: string[]): Promise<Map<string, number>> {
  if (postIds.length === 0) return new Map();

  const rows = await db
    .select({
      postId: comments.postId,
      count: count(),
    })
    .from(comments)
    .where(and(inArray(comments.postId, postIds), eq(comments.state, 'active')))
    .groupBy(comments.postId);

  return new Map(rows.map(row => [row.postId, Math.max(Number(row.count) - 1, 0)]));
}

async function getBodyComment(postId: string) {
  return db.query.comments.findFirst({
    where: and(eq(comments.postId, postId), eq(comments.state, 'active')),
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: [asc(comments.createdAt), asc(comments.id)],
  });
}

function toFeedAuthor(author: { id: string; name: string; image: string | null }): FeedAuthor {
  return {
    id: author.id,
    name: author.name,
    image: author.image,
  };
}

export async function listPosts(input: {
  actor: NullableActor;
  limit?: number | string;
  cursor?: string;
}): Promise<CursorPage<FeedPost>> {
  const pageSize = getPageSize(input.limit);
  const cursor = decodeCursor<PostListCursor>(input.cursor);

  const where = and(eq(posts.state, 'active'), buildPostCursorWhere(cursor));

  const rows = await db.query.posts.findMany({
    where,
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
      category: {
        columns: {
          id: true,
          name: true,
          isPrivate: true,
        },
      },
    },
    orderBy: [desc(posts.createdAt), desc(posts.id)],
    limit: pageSize + 1,
  });

  const hasNextPage = rows.length > pageSize;
  const pageRows = hasNextPage ? rows.slice(0, pageSize) : rows;
  const commentCounts = await getCommentCounts(pageRows.map(post => post.id));

  const items: FeedPost[] = pageRows.map(post => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    state: post.state,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    isPinned: post.isPinned,
    pinnedAt: post.pinnedAt,
    author: toFeedAuthor(post.author),
    category: {
      id: post.category.id,
      name: post.category.name,
      isPrivate: post.category.isPrivate,
    },
    commentsCount: commentCounts.get(post.id) ?? 0,
  }));

  const last = pageRows.at(-1);
  const nextCursor = hasNextPage && last
    ? encodeCursor({
        createdAt: last.createdAt.toISOString(),
        id: last.id,
      })
    : null;

  emitAfterEvent('post:afterList', { entities: pageRows, actor: input.actor, meta: {} });

  return { items, nextCursor };
}

export async function createPost(input: {
  actor: NullableActor;
  title: string;
  contentJson?: unknown | null;
  contentHtml?: string | null;
  categoryId: string;
  tags?: string[];
}): Promise<FeedPost> {
  const actor = requireActor(input.actor);
  const hasContent = hasRenderableContent({
    contentJson: input.contentJson,
    contentHtml: input.contentHtml,
  });

  if (!hasContent) {
    throw new ReforumApiError({
      code: 'BAD_REQUEST',
      message: 'Post content is required',
    });
  }

  const ctx = await emitBeforeEvent('post:beforeCreate', {
    data: {
      title: input.title,
      contentJson: input.contentJson ?? null,
      contentHtml: input.contentHtml ?? null,
      authorId: actor.id,
      categoryId: input.categoryId,
      tags: input.tags ?? [],
    },
    actor,
    meta: {},
  });

  const postId = newId('post');

  await db.transaction(async tx => {
    const category = await tx.query.categories.findFirst({
      where: eq(categories.id, ctx.data.categoryId),
      columns: { id: true },
    });

    if (!category) {
      notFound('Category not found');
    }

    await tx.insert(posts).values({
      id: postId,
      title: ctx.data.title,
      slug: slugify(ctx.data.title, { lower: true, strict: true }),
      authorId: actor.id,
      categoryId: ctx.data.categoryId,
      contentJson: ctx.data.contentJson,
      contentHtml: ctx.data.contentHtml,
    });

    await tx.insert(comments).values({
      id: newId('comment'),
      postId,
      authorId: actor.id,
      contentJson: ctx.data.contentJson,
      contentHtml: ctx.data.contentHtml,
    });

    if (ctx.data.tags.length > 0) {
      await tx.insert(postTags).values(
        ctx.data.tags.map(tagId => ({
          id: newId('post_tag'),
          postId,
          tagId,
        }))
      );
    }
  });

  const created = await getThread(postId, input.actor);
  emitAfterEvent('post:afterCreate', {
    entity: {
      id: created.id,
      authorId: created.author.id,
      categoryId: created.category.id,
      state: created.state as any,
      title: created.title,
      slug: created.slug,
      contentJson: created.contentJson,
      contentHtml: created.contentHtml,
      isPinned: false,
      pinnedAt: null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
    actor,
    meta: {},
  });

  return {
    id: created.id,
    title: created.title,
    slug: created.slug,
    state: created.state,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    isPinned: false,
    pinnedAt: null,
    author: created.author,
    category: created.category,
    commentsCount: created.repliesCount,
  };
}

export async function getThread(postId: string, actor: NullableActor): Promise<ThreadPost> {
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), ne(posts.state, 'deleted')),
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
      category: {
        columns: {
          id: true,
          name: true,
          isPrivate: true,
        },
      },
    },
  });

  if (!post) {
    notFound('Post not found');
  }

  const body = await getBodyComment(postId);
  const counts = await getCommentCounts([postId]);

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    state: post.state,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: toFeedAuthor(post.author),
    category: {
      id: post.category.id,
      name: post.category.name,
      isPrivate: post.category.isPrivate,
    },
    contentJson: post.contentJson,
    contentHtml: post.contentHtml,
    body: body
      ? {
          id: body.id,
          createdAt: body.createdAt,
          updatedAt: body.updatedAt,
          author: toFeedAuthor(body.author),
        }
      : null,
    repliesCount: counts.get(postId) ?? 0,
  };
}

export async function listThreadComments(input: {
  postId: string;
  actor: NullableActor;
  limit?: number | string;
  cursor?: string;
}): Promise<CursorPage<ThreadReply>> {
  await getThread(input.postId, input.actor);

  const bodyComment = await getBodyComment(input.postId);
  const pageSize = getPageSize(input.limit);
  const cursor = decodeCursor<CommentListCursor>(input.cursor);

  const rows = await db.query.comments.findMany({
    where: buildCommentCursorWhere(input.postId, bodyComment?.id ?? null, cursor),
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: [asc(comments.createdAt), asc(comments.id)],
    limit: pageSize + 1,
  });

  const hasNextPage = rows.length > pageSize;
  const pageRows = hasNextPage ? rows.slice(0, pageSize) : rows;

  const items: ThreadReply[] = pageRows.map(comment => ({
    id: comment.id,
    contentJson: comment.contentJson,
    contentHtml: comment.contentHtml,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    replyToCommentId: comment.replyToCommentId,
    author: toFeedAuthor(comment.author),
  }));

  const last = pageRows.at(-1);
  const nextCursor = hasNextPage && last
    ? encodeCursor({
        createdAt: last.createdAt.toISOString(),
        id: last.id,
      })
    : null;

  return { items, nextCursor };
}

export async function createComment(input: {
  actor: NullableActor;
  postId: string;
  contentJson?: unknown | null;
  contentHtml?: string | null;
  replyToCommentId?: string | null;
}) {
  const actor = requireActor(input.actor);
  const hasContent = hasRenderableContent({
    contentJson: input.contentJson,
    contentHtml: input.contentHtml,
  });

  if (!hasContent) {
    throw new ReforumApiError({
      code: 'BAD_REQUEST',
      message: 'Comment content is required',
    });
  }

  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, input.postId), eq(posts.state, 'active')),
  });

  if (!post) {
    notFound('Post not found');
  }

  const ctx = await emitBeforeEvent('comment:beforeCreate', {
    data: {
      postId: input.postId,
      authorId: actor.id,
      contentJson: input.contentJson ?? null,
      contentHtml: input.contentHtml ?? null,
      replyToCommentId: input.replyToCommentId ?? undefined,
    },
    actor,
    meta: {},
  });

  const [comment] = await db
    .insert(comments)
    .values({
      id: newId('comment'),
      postId: ctx.data.postId,
      authorId: actor.id,
      contentJson: ctx.data.contentJson ?? null,
      contentHtml: ctx.data.contentHtml ?? null,
      replyToCommentId: ctx.data.replyToCommentId ?? null,
    })
    .returning();

  const created = await db.query.comments.findFirst({
    where: eq(comments.id, comment.id),
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  emitAfterEvent('comment:afterCreate', { entity: comment, actor, meta: {}, post });

  return {
    id: created!.id,
    contentJson: created!.contentJson,
    contentHtml: created!.contentHtml,
    createdAt: created!.createdAt,
    updatedAt: created!.updatedAt,
    replyToCommentId: created!.replyToCommentId,
    author: toFeedAuthor(created!.author),
  };
}

export async function updatePost(input: {
  id: string;
  actor: NullableActor;
  title?: string;
  categoryId?: string;
  tags?: string[];
}) {
  const actor = requireActor(input.actor);

  const existing = await db.query.posts.findFirst({
    where: eq(posts.id, input.id),
  });

  if (!existing) {
    notFound('Post not found');
  }

  assertCanManageContent(actor, existing.authorId);

  const ctx = await emitBeforeEvent('post:beforeUpdate', {
    entity: existing,
    data: {
      title: input.title,
      categoryId: input.categoryId,
      tags: input.tags,
    },
    actor,
    meta: {},
  });

  const [updated] = await db
    .update(posts)
    .set({
      ...(ctx.data.title ? { title: ctx.data.title, slug: slugify(ctx.data.title, { lower: true, strict: true }) } : {}),
      ...(ctx.data.categoryId ? { categoryId: ctx.data.categoryId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, input.id))
    .returning();

  if (ctx.data.tags) {
    await db.delete(postTags).where(eq(postTags.postId, input.id));

    if (ctx.data.tags.length > 0) {
      await db.insert(postTags).values(
        ctx.data.tags.map(tagId => ({
          id: newId('post_tag'),
          postId: input.id,
          tagId,
        }))
      );
    }
  }

  emitAfterEvent('post:afterUpdate', { entity: updated, actor, meta: {} });

  return updated;
}

export async function deletePost(input: { id: string; actor: NullableActor }) {
  const actor = requireActor(input.actor);

  const existing = await db.query.posts.findFirst({
    where: eq(posts.id, input.id),
  });

  if (!existing) {
    notFound('Post not found');
  }

  assertCanManageContent(actor, existing.authorId);

  await emitBeforeEvent('post:beforeDelete', {
    entity: existing,
    actor,
    meta: {},
  });

  await db
    .update(posts)
    .set({ state: 'deleted', updatedAt: new Date() })
    .where(eq(posts.id, input.id));

  emitAfterEvent('post:afterDelete', { entity: existing, actor, meta: {} });
}

export async function getCommentById(id: string, actor: NullableActor) {
  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, id),
  });

  if (!comment) {
    notFound('Comment not found');
  }

  emitAfterEvent('comment:afterRead', { entity: comment, actor, meta: {} });

  return comment;
}

export async function updateComment(input: {
  id: string;
  actor: NullableActor;
  contentJson?: unknown | null;
  contentHtml?: string | null;
}) {
  const actor = requireActor(input.actor);

  const existing = await db.query.comments.findFirst({
    where: eq(comments.id, input.id),
  });

  if (!existing) {
    notFound('Comment not found');
  }

  assertCanManageContent(actor, existing.authorId);

  const ctx = await emitBeforeEvent('comment:beforeUpdate', {
    entity: existing,
    data: {
      contentJson: input.contentJson,
      contentHtml: input.contentHtml,
    },
    actor,
    meta: {},
  });

  const [updated] = await db
    .update(comments)
    .set({
      ...ctx.data,
      updatedAt: new Date(),
    })
    .where(eq(comments.id, input.id))
    .returning();

  emitAfterEvent('comment:afterUpdate', { entity: updated, actor, meta: {} });

  return updated;
}

export async function deleteComment(input: { id: string; actor: NullableActor }) {
  const actor = requireActor(input.actor);

  const existing = await db.query.comments.findFirst({
    where: eq(comments.id, input.id),
  });

  if (!existing) {
    notFound('Comment not found');
  }

  assertCanManageContent(actor, existing.authorId);

  await emitBeforeEvent('comment:beforeDelete', {
    entity: existing,
    actor,
    meta: {},
  });

  await db
    .update(comments)
    .set({ state: 'deleted', updatedAt: new Date() })
    .where(eq(comments.id, input.id));

  emitAfterEvent('comment:afterDelete', { entity: existing, actor, meta: {} });
}
