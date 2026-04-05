import type {
  PostSelect,
  PostInsert,
  CommentSelect,
  CommentInsert,
  CategorySelect,
  CategoryInsert,
  TagSelect,
  TagInsert,
  UserSelect,
} from '@/server/db/schema';
import type {
  votes,
  reactions,
  flags,
} from '@/server/db/schema';

// --------------------------------------------------------
// Shared types
// --------------------------------------------------------

export type Actor = {
  id: string;
  role: string;
};

export type Meta = Record<string, unknown>;

// --------------------------------------------------------
// Base context shapes
// --------------------------------------------------------

type BeforeCreateCtx<TData> = { data: TData; actor: Actor; meta: Meta };
type AfterCreateCtx<TEntity> = { entity: TEntity; actor: Actor; meta: Meta };
type BeforeUpdateCtx<TEntity, TData> = { entity: TEntity; data: TData; actor: Actor; meta: Meta };
type AfterUpdateCtx<TEntity> = { entity: TEntity; actor: Actor; meta: Meta };
type BeforeDeleteCtx<TEntity> = { entity: TEntity; actor: Actor; meta: Meta };
type AfterDeleteCtx<TEntity> = { entity: TEntity; actor: Actor; meta: Meta };
type BeforeReadCtx = { id: string; actor: Actor | null; meta: Meta };
type AfterReadCtx<TEntity> = { entity: TEntity; actor: Actor | null; meta: Meta };
type AfterListCtx<TEntity> = { entities: TEntity[]; actor: Actor | null; meta: Meta };

// --------------------------------------------------------
// Derived types for new tables
// --------------------------------------------------------

type VoteSelect = typeof votes.$inferSelect;
type ReactionSelect = typeof reactions.$inferSelect;
type FlagSelect = typeof flags.$inferSelect;

// --------------------------------------------------------
// Post data (what the create API receives, minus server-generated fields)
// --------------------------------------------------------

type PostCreateData = {
  title: string;
  content: string;
  authorId: string;
  categoryId: string;
  tags: string[];
};

type PostUpdateData = {
  title?: string;
  categoryId?: string;
  tags?: string[];
};

type CommentCreateData = {
  postId: string;
  authorId: string;
  content: string;
  replyToCommentId?: string;
};

type CommentUpdateData = {
  content?: string;
};

type CategoryCreateData = {
  name: string;
  description?: string;
  isPrivate?: boolean;
};

type CategoryUpdateData = {
  name?: string;
  description?: string;
  isPrivate?: boolean;
};

type TagCreateData = {
  name: string;
};

type TagUpdateData = {
  name?: string;
};

// --------------------------------------------------------
// Before Event Map (hooks that can modify data or reject)
// --------------------------------------------------------

export interface BeforeEventMap {
  // Posts
  'post:beforeCreate': BeforeCreateCtx<PostCreateData>;
  'post:beforeUpdate': BeforeUpdateCtx<PostSelect, PostUpdateData>;
  'post:beforeDelete': BeforeDeleteCtx<PostSelect>;
  'post:beforeRead': BeforeReadCtx;

  // Comments
  'comment:beforeCreate': BeforeCreateCtx<CommentCreateData>;
  'comment:beforeUpdate': BeforeUpdateCtx<CommentSelect, CommentUpdateData>;
  'comment:beforeDelete': BeforeDeleteCtx<CommentSelect>;
  'comment:beforeRead': BeforeReadCtx;

  // Categories
  'category:beforeCreate': BeforeCreateCtx<CategoryCreateData>;
  'category:beforeUpdate': BeforeUpdateCtx<CategorySelect, CategoryUpdateData>;
  'category:beforeDelete': BeforeDeleteCtx<CategorySelect>;

  // Tags
  'tag:beforeCreate': BeforeCreateCtx<TagCreateData>;
  'tag:beforeUpdate': BeforeUpdateCtx<TagSelect, TagUpdateData>;
  'tag:beforeDelete': BeforeDeleteCtx<TagSelect>;

  // Votes
  'vote:beforeCreate': BeforeCreateCtx<{ targetType: string; targetId: string; value: number }>;
  'vote:beforeDelete': BeforeDeleteCtx<VoteSelect>;

  // Reactions
  'reaction:beforeCreate': BeforeCreateCtx<{ targetType: string; targetId: string; emoji: string }>;
  'reaction:beforeDelete': BeforeDeleteCtx<ReactionSelect>;

  // Flags
  'flag:beforeCreate': BeforeCreateCtx<{ targetType: string; targetId: string; reason: string; details?: string }>;
}

// --------------------------------------------------------
// After Event Map (fire-and-forget side effects)
// --------------------------------------------------------

export interface AfterEventMap {
  // Posts
  'post:afterCreate': AfterCreateCtx<PostSelect>;
  'post:afterUpdate': AfterUpdateCtx<PostSelect>;
  'post:afterDelete': AfterDeleteCtx<PostSelect>;
  'post:afterRead': AfterReadCtx<PostSelect>;
  'post:afterList': AfterListCtx<PostSelect>;

  // Comments
  'comment:afterCreate': AfterCreateCtx<CommentSelect> & { post: PostSelect };
  'comment:afterUpdate': AfterUpdateCtx<CommentSelect>;
  'comment:afterDelete': AfterDeleteCtx<CommentSelect>;
  'comment:afterRead': AfterReadCtx<CommentSelect>;

  // Categories
  'category:afterCreate': AfterCreateCtx<CategorySelect>;
  'category:afterUpdate': AfterUpdateCtx<CategorySelect>;
  'category:afterDelete': AfterDeleteCtx<CategorySelect>;

  // Tags
  'tag:afterCreate': AfterCreateCtx<TagSelect>;
  'tag:afterUpdate': AfterUpdateCtx<TagSelect>;
  'tag:afterDelete': AfterDeleteCtx<TagSelect>;

  // Votes
  'vote:afterCreate': AfterCreateCtx<VoteSelect>;
  'vote:afterDelete': AfterDeleteCtx<VoteSelect>;

  // Reactions
  'reaction:afterCreate': AfterCreateCtx<ReactionSelect>;
  'reaction:afterDelete': AfterDeleteCtx<ReactionSelect>;

  // Flags
  'flag:afterCreate': AfterCreateCtx<FlagSelect>;

  // Auth (after-only, bridge from better-auth databaseHooks)
  'user:afterSignup': { user: UserSelect; actor: Actor; meta: Meta };
  'user:afterLogin': { user: UserSelect; session: { id: string; token: string }; meta: Meta };
}

// --------------------------------------------------------
// Combined map for type utilities
// --------------------------------------------------------

export type EventMap = BeforeEventMap & AfterEventMap;
export type BeforeEventName = keyof BeforeEventMap;
export type AfterEventName = keyof AfterEventMap;
export type EventName = keyof EventMap;
