import {
  pgTable,
  text,
  timestamp,
  index,
  json,
  boolean,
  pgEnum,
  bigint,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

//--------------------------------------------------------
// AUTH TABLES (better-auth managed)
//--------------------------------------------------------

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  role: text('role').notNull().default('user'), // 'user' | 'moderator' | 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const apikeys = pgTable('apikeys', {
  id: text('id').primaryKey(),
  name: text('name'),
  start: text('start'),
  prefix: text('prefix'),
  key: text('key').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refillInterval: integer('refill_interval'),
  refillAmount: integer('refill_amount'),
  lastRefillAt: timestamp('last_refill_at'),
  enabled: boolean('enabled').default(true),
  rateLimitEnabled: boolean('rate_limit_enabled').default(true),
  rateLimitTimeWindow: integer('rate_limit_time_window').default(86400000),
  rateLimitMax: integer('rate_limit_max').default(10),
  requestCount: integer('request_count').default(0),
  remaining: integer('remaining'),
  lastRequest: timestamp('last_request'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  permissions: text('permissions'),
  metadata: text('metadata'),
});

export const rateLimits = pgTable('rate_limits', {
  id: text('id').primaryKey(),
  key: text('key'),
  count: integer('count'),
  lastRequest: bigint('last_request', { mode: 'number' }),
});

//--------------------------------------------------------
// AUDIT LOGS
//--------------------------------------------------------

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    objectType: text('object_type').notNull(),
    objectId: text('object_id').notNull(),
    details: json('details').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_audit_logs_actor').on(t.actorUserId)]
);

//--------------------------------------------------------
// POSTS
//--------------------------------------------------------

export const postStates = pgEnum('post_states', [
  'active',
  'hidden',
  'flagged',
  'deleted',
]);

export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    state: postStates().notNull().default('active'),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    contentJson: jsonb('content_json'),
    contentHtml: text('content_html'),
    isPinned: boolean('is_pinned').notNull().default(false),
    pinnedAt: timestamp('pinned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_posts_author').on(t.authorId),
    index('idx_posts_category').on(t.categoryId),
    index('idx_posts_slug').on(t.slug),
  ]
);

//--------------------------------------------------------
// COMMENTS
//--------------------------------------------------------

export const commentStates = pgEnum('comment_states', [
  'active',
  'hidden',
  'flagged',
  'deleted',
]);

export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    state: commentStates().notNull().default('active'),
    replyToCommentId: text('reply_to_comment_id'),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_comments_post').on(t.postId),
    index('idx_comments_author').on(t.authorId),
  ]
);

//--------------------------------------------------------
// CATEGORIES
//--------------------------------------------------------

export const categories = pgTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    isPrivate: boolean('is_private').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_categories_name').on(t.name)]
);

//--------------------------------------------------------
// TAGS
//--------------------------------------------------------

export const tags = pgTable(
  'tags',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_tags_name').on(t.name)]
);

export const postTags = pgTable(
  'post_tags',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_post_tags_post').on(t.postId),
    index('idx_post_tags_tag').on(t.tagId),
  ]
);

//--------------------------------------------------------
// VOTES (upvote/downvote)
//--------------------------------------------------------

export const votes = pgTable(
  'votes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(), // 'post' | 'comment'
    targetId: text('target_id').notNull(),
    value: integer('value').notNull(), // 1 or -1
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_votes_target').on(t.targetType, t.targetId),
    index('idx_votes_user').on(t.userId),
  ]
);

//--------------------------------------------------------
// REACTIONS (emoji)
//--------------------------------------------------------

export const reactions = pgTable(
  'reactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(), // 'post' | 'comment'
    targetId: text('target_id').notNull(),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_reactions_target').on(t.targetType, t.targetId),
    index('idx_reactions_user').on(t.userId),
  ]
);

//--------------------------------------------------------
// USER PROFILES
//--------------------------------------------------------

export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  website: text('website'),
  location: text('location'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

//--------------------------------------------------------
// GROUPS & ACCESS
//--------------------------------------------------------

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userGroups = pgTable(
  'user_groups',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_user_groups_user').on(t.userId),
    index('idx_user_groups_group').on(t.groupId),
  ]
);

export const categoryGroups = pgTable(
  'category_groups',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_category_groups_category').on(t.categoryId),
    index('idx_category_groups_group').on(t.groupId),
  ]
);

//--------------------------------------------------------
// BOOKMARKS
//--------------------------------------------------------

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_bookmarks_user').on(t.userId),
    index('idx_bookmarks_post').on(t.postId),
  ]
);

//--------------------------------------------------------
// DRAFTS
//--------------------------------------------------------

export const drafts = pgTable(
  'drafts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    contentJson: jsonb('content_json'),
    categoryId: text('category_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_drafts_user').on(t.userId)]
);

//--------------------------------------------------------
// FLAGS (moderation)
//--------------------------------------------------------

export const flagReasons = pgEnum('flag_reasons', [
  'spam',
  'offensive',
  'off-topic',
  'other',
]);

export const flagStatuses = pgEnum('flag_statuses', [
  'pending',
  'accepted',
  'rejected',
]);

export const flags = pgTable(
  'flags',
  {
    id: text('id').primaryKey(),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(), // 'post' | 'comment'
    targetId: text('target_id').notNull(),
    reason: flagReasons().notNull(),
    details: text('details'),
    status: flagStatuses().notNull().default('pending'),
    reviewedBy: text('reviewed_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_flags_target').on(t.targetType, t.targetId),
    index('idx_flags_status').on(t.status),
  ]
);

//--------------------------------------------------------
// NOTIFICATIONS
//--------------------------------------------------------

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'reply' | 'reaction' | 'mention' | 'flag'
    targetType: text('target_type').notNull(), // 'post' | 'comment'
    targetId: text('target_id').notNull(),
    actorIds: jsonb('actor_ids').notNull().default([]),
    actorCount: integer('actor_count').notNull().default(0),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_notifications_user').on(t.userId),
    index('idx_notifications_read').on(t.userId, t.read),
  ]
);

//--------------------------------------------------------
// UPLOADS
//--------------------------------------------------------

export const uploads = pgTable(
  'uploads',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    storagePath: text('storage_path').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_uploads_user').on(t.userId)]
);

//--------------------------------------------------------
// SETTINGS (runtime config)
//--------------------------------------------------------

export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

//--------------------------------------------------------
// TYPE EXPORTS
//--------------------------------------------------------

export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;
export type PostInsert = typeof posts.$inferInsert;
export type PostSelect = typeof posts.$inferSelect;
export type CommentInsert = typeof comments.$inferInsert;
export type CommentSelect = typeof comments.$inferSelect;
export type TagInsert = typeof tags.$inferInsert;
export type TagSelect = typeof tags.$inferSelect;
export type PostTagInsert = typeof postTags.$inferInsert;
export type PostTagSelect = typeof postTags.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
export type CategorySelect = typeof categories.$inferSelect;
export type AuditLogInsert = typeof auditLogs.$inferInsert;
export type AuditLogSelect = typeof auditLogs.$inferSelect;

//--------------------------------------------------------
// RELATIONS
//--------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  posts: many(posts),
  comments: many(comments),
  auditLogs: many(auditLogs),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [posts.categoryId],
    references: [categories.id],
  }),
  comments: many(comments),
  postTags: many(postTags),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(posts),
  categoryGroups: many(categoryGroups),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  userGroups: many(userGroups),
  categoryGroups: many(categoryGroups),
}));

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  user: one(users, {
    fields: [userGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [userGroups.groupId],
    references: [groups.id],
  }),
}));

export const categoryGroupsRelations = relations(categoryGroups, ({ one }) => ({
  category: one(categories, {
    fields: [categoryGroups.categoryId],
    references: [categories.id],
  }),
  group: one(groups, {
    fields: [categoryGroups.groupId],
    references: [groups.id],
  }),
}));
