import { and, desc, eq, type SQL } from 'drizzle-orm';
import { db } from '@/server/db';
import { comments, flags, posts } from '@/server/db/schema';
import { ReforumApiError } from '@/server/errors';
import { newId } from '@/server/lib/id';
import { emitAfterEvent, emitBeforeEvent } from '@/server/lib/events';
import type { Actor } from '@/server/lib/event-types';
import { canAccessCategory, hasRolePermission } from '@/server/lib/permissions';

type NullableActor = Actor | null;
type FlagTargetType = 'post' | 'comment';
type FlagReason = 'spam' | 'offensive' | 'off-topic' | 'other';
type FlagStatus = 'pending' | 'accepted' | 'rejected';
type ModerationContentAction = 'none' | 'hide' | 'delete' | 'restore';
type ModerationFlag = typeof flags.$inferSelect;

function unauthorized(message = 'Authentication required'): never {
  throw new ReforumApiError({ code: 'UNAUTHORIZED', message });
}

function forbidden(message = 'Insufficient permissions to perform this action'): never {
  throw new ReforumApiError({ code: 'FORBIDDEN', message });
}

function notFound(message = 'Not found'): never {
  throw new ReforumApiError({ code: 'NOT_FOUND', message });
}

function badRequest(message: string): never {
  throw new ReforumApiError({ code: 'BAD_REQUEST', message });
}

function requireActor(actor: NullableActor): Actor {
  if (!actor) unauthorized();
  return actor;
}

async function requireRolePermission(
  actor: Actor,
  action: 'create' | 'read' | 'update'
) {
  if (!(await hasRolePermission(actor.role, 'moderation', action))) {
    forbidden();
  }
}

async function getTarget(targetType: FlagTargetType, targetId: string) {
  if (targetType === 'post') {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, targetId),
      columns: {
        id: true,
        categoryId: true,
        state: true,
      },
    });

    if (!post || post.state === 'deleted') {
      notFound('Target not found');
    }

    return { targetType, target: post };
  }

  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, targetId),
    columns: {
      id: true,
      postId: true,
      state: true,
    },
    with: {
      post: {
        columns: {
          id: true,
          categoryId: true,
          state: true,
        },
      },
    },
  });

  if (!comment || comment.state === 'deleted' || comment.post.state === 'deleted') {
    notFound('Target not found');
  }

  return { targetType, target: comment };
}

async function assertCanAccessTarget(
  actor: Actor,
  targetType: FlagTargetType,
  targetId: string
) {
  const target = await getTarget(targetType, targetId);
  const categoryId = target.targetType === 'post'
    ? target.target.categoryId
    : target.target.post.categoryId;

  if (!(await canAccessCategory(actor, categoryId))) {
    notFound('Target not found');
  }
}

async function canAccessFlagTarget(actor: Actor, flag: Pick<ModerationFlag, 'targetType' | 'targetId'>) {
  if (!['post', 'comment'].includes(flag.targetType)) {
    return false;
  }

  try {
    await assertCanAccessTarget(actor, flag.targetType as FlagTargetType, flag.targetId);
    return true;
  } catch (error) {
    if (error instanceof ReforumApiError && error.code === 'NOT_FOUND') {
      return false;
    }

    throw error;
  }
}

export async function createFlag(input: {
  actor: NullableActor;
  targetType: FlagTargetType;
  targetId: string;
  reason: FlagReason;
  details?: string | null;
}) {
  const actor = requireActor(input.actor);
  await requireRolePermission(actor, 'create');
  await assertCanAccessTarget(actor, input.targetType, input.targetId);

  const ctx = await emitBeforeEvent('flag:beforeCreate', {
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details ?? undefined,
    },
    actor,
    meta: {},
  });

  const [flag] = await db
    .insert(flags)
    .values({
      id: newId('flag'),
      reporterId: actor.id,
      targetType: ctx.data.targetType,
      targetId: ctx.data.targetId,
      reason: ctx.data.reason as FlagReason,
      details: ctx.data.details ?? null,
    })
    .returning();

  emitAfterEvent('flag:afterCreate', { entity: flag, actor, meta: {} });

  return flag;
}

export async function listFlags(input: {
  actor: NullableActor;
  status?: FlagStatus;
  limit?: number | string;
}) {
  const actor = requireActor(input.actor);
  await requireRolePermission(actor, 'read');

  const parsedLimit = Number(input.limit ?? 50);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100)
    : 50;
  const filters: SQL[] = [];

  if (input.status) {
    filters.push(eq(flags.status, input.status));
  }

  const rows = await db.query.flags.findMany({
    where: filters.length > 0 ? and(...filters) : undefined,
    orderBy: [desc(flags.createdAt)],
    limit,
  });

  const visibleFlags: ModerationFlag[] = [];

  for (const flag of rows) {
    if (await canAccessFlagTarget(actor, flag)) {
      visibleFlags.push(flag);
    }
  }

  return visibleFlags;
}

export async function reviewFlag(input: {
  actor: NullableActor;
  id: string;
  status: Exclude<FlagStatus, 'pending'>;
  contentAction?: ModerationContentAction;
}) {
  const actor = requireActor(input.actor);
  await requireRolePermission(actor, 'update');

  const existing = await db.query.flags.findFirst({
    where: eq(flags.id, input.id),
  });

  if (!existing) {
    notFound('Flag not found');
  }

  if (!['post', 'comment'].includes(existing.targetType)) {
    badRequest('Unsupported flag target');
  }

  const contentAction = input.contentAction ?? 'none';

  if (input.status === 'rejected' && contentAction !== 'none') {
    badRequest('Rejected flags cannot change content state');
  }

  await assertCanAccessTarget(
    actor,
    existing.targetType as FlagTargetType,
    existing.targetId
  );

  await db.transaction(async tx => {
    await tx
      .update(flags)
      .set({
        status: input.status,
        reviewedBy: actor.id,
        resolvedAt: new Date(),
      })
      .where(eq(flags.id, input.id));

    if (contentAction === 'none') {
      return;
    }

    const state = contentAction === 'restore'
      ? 'active'
      : contentAction === 'hide'
        ? 'hidden'
        : 'deleted';
    if (existing.targetType === 'post') {
      await tx
        .update(posts)
        .set({ state, updatedAt: new Date() })
        .where(eq(posts.id, existing.targetId));
      return;
    }

    await tx
      .update(comments)
      .set({ state, updatedAt: new Date() })
      .where(eq(comments.id, existing.targetId));
  });

  const reviewed = await db.query.flags.findFirst({
    where: eq(flags.id, input.id),
  });

  return reviewed!;
}
