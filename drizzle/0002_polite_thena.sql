CREATE TABLE "category_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"role_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"editor_user_id" text NOT NULL,
	"content_markdown" text NOT NULL,
	"content_json" jsonb,
	"content_html" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"editor_user_id" text NOT NULL,
	"title" text NOT NULL,
	"content_markdown" text NOT NULL,
	"content_json" jsonb,
	"content_html" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "roles" ("id", "name", "description", "is_system") VALUES
	('user', 'User', 'Default signed-in community member role.', true),
	('moderator', 'Moderator', 'Default content moderation role.', true),
	('admin', 'Admin', 'Default site administration role.', true);
--> statement-breakpoint
INSERT INTO "role_permissions" ("id", "role_id", "resource", "action") VALUES
	('rp_user_post_create', 'user', 'post', 'create'),
	('rp_user_post_read', 'user', 'post', 'read'),
	('rp_user_comment_create', 'user', 'comment', 'create'),
	('rp_user_comment_read', 'user', 'comment', 'read'),
	('rp_user_tag_read', 'user', 'tag', 'read'),
	('rp_user_category_read', 'user', 'category', 'read'),
	('rp_moderator_post_create', 'moderator', 'post', 'create'),
	('rp_moderator_post_read', 'moderator', 'post', 'read'),
	('rp_moderator_post_update', 'moderator', 'post', 'update'),
	('rp_moderator_post_delete', 'moderator', 'post', 'delete'),
	('rp_moderator_comment_create', 'moderator', 'comment', 'create'),
	('rp_moderator_comment_read', 'moderator', 'comment', 'read'),
	('rp_moderator_comment_update', 'moderator', 'comment', 'update'),
	('rp_moderator_comment_delete', 'moderator', 'comment', 'delete'),
	('rp_moderator_tag_create', 'moderator', 'tag', 'create'),
	('rp_moderator_tag_read', 'moderator', 'tag', 'read'),
	('rp_moderator_tag_update', 'moderator', 'tag', 'update'),
	('rp_moderator_category_read', 'moderator', 'category', 'read'),
	('rp_moderator_users_read', 'moderator', 'users', 'read'),
	('rp_admin_post_create', 'admin', 'post', 'create'),
	('rp_admin_post_read', 'admin', 'post', 'read'),
	('rp_admin_post_update', 'admin', 'post', 'update'),
	('rp_admin_post_delete', 'admin', 'post', 'delete'),
	('rp_admin_comment_create', 'admin', 'comment', 'create'),
	('rp_admin_comment_read', 'admin', 'comment', 'read'),
	('rp_admin_comment_update', 'admin', 'comment', 'update'),
	('rp_admin_comment_delete', 'admin', 'comment', 'delete'),
	('rp_admin_tag_create', 'admin', 'tag', 'create'),
	('rp_admin_tag_read', 'admin', 'tag', 'read'),
	('rp_admin_tag_update', 'admin', 'tag', 'update'),
	('rp_admin_tag_delete', 'admin', 'tag', 'delete'),
	('rp_admin_category_create', 'admin', 'category', 'create'),
	('rp_admin_category_read', 'admin', 'category', 'read'),
	('rp_admin_category_update', 'admin', 'category', 'update'),
	('rp_admin_category_delete', 'admin', 'category', 'delete'),
	('rp_admin_group_create', 'admin', 'group', 'create'),
	('rp_admin_group_read', 'admin', 'group', 'read'),
	('rp_admin_group_update', 'admin', 'group', 'update'),
	('rp_admin_group_delete', 'admin', 'group', 'delete'),
	('rp_admin_settings_read', 'admin', 'settings', 'read'),
	('rp_admin_settings_update', 'admin', 'settings', 'update'),
	('rp_admin_users_read', 'admin', 'users', 'read'),
	('rp_admin_users_update', 'admin', 'users', 'update'),
	('rp_admin_users_ban', 'admin', 'users', 'ban');
--> statement-breakpoint
ALTER TABLE "category_roles" ADD CONSTRAINT "category_roles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_roles" ADD CONSTRAINT "category_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_revisions" ADD CONSTRAINT "comment_revisions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_revisions" ADD CONSTRAINT "comment_revisions_editor_user_id_users_id_fk" FOREIGN KEY ("editor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_editor_user_id_users_id_fk" FOREIGN KEY ("editor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_category_roles_category" ON "category_roles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_category_roles_role" ON "category_roles" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_category_roles_unique" ON "category_roles" USING btree ("category_id","role_id");--> statement-breakpoint
CREATE INDEX "idx_comment_revisions_comment" ON "comment_revisions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "idx_comment_revisions_editor" ON "comment_revisions" USING btree ("editor_user_id");--> statement-breakpoint
CREATE INDEX "idx_post_revisions_post" ON "post_revisions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_post_revisions_editor" ON "post_revisions" USING btree ("editor_user_id");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_permissions_unique" ON "role_permissions" USING btree ("role_id","resource","action");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_name_unique" ON "roles" USING btree ("name");
