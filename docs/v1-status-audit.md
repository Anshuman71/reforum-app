# Reforum V1 Status Audit

Reference design: [v1-design.md](./v1-design.md)

## Current Stage

The codebase is in **mid Stage 2**, with **Milestone 1A**, **Milestone 2A**, and **Milestone 2B** complete at the V1 foundation level. Remaining RBAC work is now product expansion: future moderation workflows and broader integration coverage.

In practical terms:

- There is a working forum foundation with auth, posts, categories, comments, tags, admin tooling, and cursor pagination.
- S3-compatible storage with presigned direct uploads is implemented and working for both avatars and content images.
- The Tiptap editor has been fully removed; the Slate-based editor is now the only rich text editor.
- The legacy `content` field has been removed from posts and comments (replaced by `bodyMarkdown`/`bodyHtml`).
- The biggest remaining gaps are email provider integration and completing product hardening around moderation, notifications, and search.

## What Exists Today

### Working foundation pieces

- Better Auth is wired with DB-backed sessions and custom ID generation.
- Permission-driven RBAC exists and is enforced in admin, category, tag, upload, category visibility, and core post/comment mutation flows.
- Posts, comments, categories, tags, admin users, and basic forum pages are present.
- There is already a lightweight event hook system using `after()`.
- The database schema includes several future-facing tables such as notifications, flags, uploads, bookmarks, votes, and reactions.
- Core forum logic now lives in a service layer instead of only inside Hono handlers.
- Cursor pagination is implemented for post feeds and thread replies.
- Thread detail rendering is now functional instead of placeholder-only.
- The server no longer trusts client-sent authorship for post and comment creation.
- Provider seams now exist for email and storage adapters.
- S3-compatible storage adapter with presigned direct uploads is implemented and production-ready.
- Local storage adapter serves as the development fallback.
- Avatar upload and content image upload flows are both implemented end-to-end.
- The Slate rich text editor is the active editor; all Tiptap code and dependencies have been removed.
- The legacy `content` column has been removed from posts and comments; content is now stored as `bodyMarkdown` (canonical) with `bodyHtml` as the derived/renderable representation.
- Upload file names are hashed server-side to avoid collisions and leak-free storage paths.
- Error handling has been improved with structured HTTP error responses.

### Evidence in the codebase

- Auth setup: [src/server/lib/auth.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/lib/auth.ts:9)
- Auth middleware: [src/server/common/middlewares.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/common/middlewares.ts:8)
- RBAC helper: [src/server/api-auth/index.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/api-auth/index.ts:17)
- Permission map: [src/server/lib/permissions.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/lib/permissions.ts:1)
- Shared role source: [src/lib/roles.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/lib/roles.ts:1)
- Role management UI: [src/app/admin/settings/roles/page.tsx](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/app/admin/settings/roles/page.tsx:1)
- Group management UI: [src/app/admin/settings/groups/page.tsx](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/app/admin/settings/groups/page.tsx:1)
- Event bus placeholder: [src/server/lib/events.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/lib/events.ts:116)
- Main schema: [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:19)
- Posts page: [src/app/page.tsx](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/app/page.tsx:9)
- Create post UI: [src/components/posts/CreatePostModal.tsx](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/components/posts/CreatePostModal.tsx:39)
- Posts handlers: [src/server/api/posts/posts.handlers.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/api/posts/posts.handlers.ts:35)
- Forum services: [src/server/services/forum.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/services/forum.ts:1)
- Thread page: [src/components/posts/PostDetailPage.tsx](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/components/posts/PostDetailPage.tsx:1)
- Slate editor: [src/components/posts/PostRichTextEditor.tsx](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/components/posts/PostRichTextEditor.tsx:1)
- HTML renderer: [src/components/posts/PostRichTextContent.tsx](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/components/posts/PostRichTextContent.tsx:1)
- Upload utilities: [src/lib/upload-utils.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/lib/upload-utils.ts:1)
- S3 adapter: [src/server/adapters/storage/s3.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/adapters/storage/s3.ts:1)
- Upload API: [src/server/api/uploads/uploads.handlers.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/api/uploads/uploads.handlers.ts:1)
- Structured errors: [src/server/errors/http.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/errors/http.ts:1)

## Gap Against The V1 Design

The following parts of the design are still incomplete or not aligned with the intended architecture.

### Milestone 1 gaps

- Better Auth exists, but Resend/email integration is not yet present.
- No strict modular boundaries are enforced yet as described in the design.
- Permission-based RBAC is now the primary enforcement layer for sensitive runtime mutations.

### Milestone 2 and infra gaps

- ~~Serverless storage via presigned URLs is not implemented.~~ **Done.** Presigned direct uploads and local relay fallback are both implemented.
- ~~Current storage adapter is local filesystem based, which is useful for development but not aligned with the serverless design.~~ **Done.** S3-compatible adapter is now the production path; local adapter is the dev fallback.
- ~~No S3-compatible storage adapter exists yet.~~ **Done.** `src/server/adapters/storage/s3.ts` implements presigned PUT uploads.
- ~~Avatar upload flow is not implemented yet.~~ **Done.** Avatar and content image uploads both work end-to-end.

### Editor and content model gaps

- ~~The editor implementation still uses Tiptap.~~ **Done.** Tiptap has been fully removed; Slate is now the active editor.
- ~~Post/comment content model is ambiguous.~~ **Done.** The legacy `content` field has been removed. Content is now stored as `bodyMarkdown` (canonical) with `bodyHtml` (derived renderable).
- The Slate editor still has a known crash in `isMarkActive` when void image nodes affect selection paths — this needs a more robust fix.
- `@floating-ui/react` ~~remains in `package.json` but is no longer imported from any source file; it can be removed as cleanup.~~ Removed from `package.json`.

### Partial alignment issues

- The design calls for strictly flat threads with reply metadata handled as a lightweight reference pattern.
- The current schema uses `replyToCommentId` on comments, which is workable, but it is not a clean match for the target model described in the design.
- ~~There are still stale org-era leftovers in auth support code, such as unused organization/member/invitation ID prefixes.~~ **Done.** The stale ID prefixes have been removed; the app remains single-tenant with no Better Auth organization plugin.

## Honest Status Summary

The project is best described as:

**A functioning forum with production-safe storage that now needs authorization hardening, email integration, and product hardening.**

That means:

- usable for real iteration on discussion, auth, and media flows,
- production-safe for file uploads on both S3 and local development paths,
- close to completing the platform storage and content model direction,
- still needing RBAC, email, moderation, notifications, and search to close out V1 foundation work.

## First Recommended Milestone

## Milestone 1A: Solidify The Core Forum Foundation

Goal: convert the current prototype slice into a clean, secure, reusable Stage 1 base for core forum behavior.

### TODOs

- [x] `M1.1` Extract post and thread logic from handlers into service functions such as `createPost`, `listPosts`, and `getThread`.
- [x] `M1.2` Stop trusting client-sent `authorId`; derive the acting user from the authenticated session on the server.
- [x] `M1.3` Replace `offset` contracts with cursor pagination for post feeds and thread comments.
- [x] `M1.4` Finish the thread detail experience so a post page returns real topic and reply data instead of a placeholder.
- [x] `M1.5` Normalize Stage 1 infra seams by using `getEnvs()` consistently and defining provider boundaries for email and storage.

## Updated Assessment

Milestone 1A is complete.

What remains from the broader Stage 1 design is mostly:

- provider-backed email,
- future moderation workflows,
- stricter modular boundaries.

~~Storage infrastructure~~ is now complete (Milestone 2A).

The next best work should target platform capability, not more feed/thread cleanup.

## Next Target Milestone

## Milestone 2A: S3-Compatible Storage Foundation

Goal: move uploads off the application filesystem and establish a production-safe storage contract using presigned direct uploads.

### TODOs

- [x] `M2.1` Add an S3-compatible storage adapter alongside the local adapter.
- [x] `M2.2` Add required env/config shape for S3-compatible providers.
- [x] `M2.3` Extend the storage contract to support presigned upload URLs.
- [x] `M2.4` Add an upload API route that issues presigned URLs without proxying file bytes through the app server.
- [x] `M2.5` Implement avatar upload as the first client flow using direct upload.
- [x] `M2.6` Store uploaded avatar metadata and user image URL consistently in app state and DB usage paths.
- [x] `M2.7` Keep local storage as the development fallback, but make S3-compatible storage the production-ready path.

## Updated Assessment

Milestone 2A is complete.

The app now has:

- an S3-compatible storage adapter,
- a unified upload-preparation contract,
- a local relay fallback for development,
- avatar upload as the first end-to-end storage-backed client flow.

The next best target is now provider-backed email.

## Follow-Up Milestone

## Milestone 2B: Permission-Driven RBAC Design

Goal: shift authorization from mainly role-name checks to explicit permission checks aligned with the app's single-tenant model.

### TODOs

- [x] `R1` Finalize the permission vocabulary in `src/server/lib/permissions.ts`.
- [x] `R2` Decide the initial custom roles beyond `user`, `moderator`, and `admin` if needed. No additional static roles are needed; custom roles are supported dynamically through the roles UI.
- [x] `R3` Add a reusable server-side permission-check helper for services and route handlers.
- [x] `R4` Replace direct role branching in sensitive flows with permission-based checks where appropriate.
- [x] `R5` Keep global roles on `users.role`; do not reintroduce organizations for RBAC.
- [x] `R6` Remove stale org-era auth leftovers that no longer match the single-tenant direction.

### Current M2B Progress

- `src/lib/roles.ts` now centralizes the current default role names (`user`, `moderator`, `admin`) for API and UI usage.
- `src/server/lib/permissions.ts` now defines a typed permission vocabulary, the default role matrix, DB-backed permission lookup, category visibility helpers, and content ownership checks.
- `src/server/api-auth/index.ts` now exposes reusable async permission guards for Hono handlers and service-layer actor checks.
- Admin user APIs, category mutations, tag mutations, upload flows, admin layout access, and core post/comment create/update/delete service logic now use permission checks for sensitive behavior.
- Admin role APIs can list available permissions, create/update/delete custom roles, and protect system roles from mutation.
- The admin user-role assignment API validates against known roles, and the UI can assign custom roles.
- `/admin/settings/roles` lets admins compose custom roles from known permissions.
- Category reads and post feeds now hide private categories unless the actor has admin-level access, an allowed role, or an allowed group.
- `/admin/settings/groups` lets admins create groups and assign users to them.
- Category settings can mark categories private and assign allowed roles and groups.
- Category role/group visibility assignments are validated before write and category visibility updates are transactional.
- Admin user role assignment and group membership assignment now validate referenced users/roles before write.
- Moderation now has a permission-gated API foundation for user-submitted flags, moderator/admin queue reads, flag review, and optional hide/delete/restore content actions.
- Thread pages now expose report actions for posts and replies so authenticated users can submit flags into the moderation queue.
- `/admin/moderation` provides a moderator command center for queue review and hide/delete/restore decisions; `/admin` routes moderators there when they do not have settings access.
- Signed-out create-post and reply affordances now route users to sign-in instead of exposing forms they cannot submit.
- Focused RBAC coverage exists in `tests/unit/permissions.test.ts`, `tests/unit/moderation.test.ts`, and `tests/integration/rbac-api.test.ts` for tag/category mutation permissions, moderator/admin paths, custom role permission lookup, default-role fallback behavior, session-backed moderation queue access, session-backed custom role assignment, group-based private category visibility, moderation review rules, and post/comment ownership rules.
- Stale org-era Better Auth ID prefixes for `member`, `organization`, and `invitation` have been removed. The active Better Auth config still has no organization plugin, and the schema still has no organization/member/invitation tables.

### Remaining RBAC Work

M2B is complete at the foundation level, but RBAC still has follow-up work before the broader V1 product can be considered closed:

- **Moderation workflows**: a reports/flags workflow exists, including thread report actions, queue reads, review decisions, a moderator command center, and hide/delete/restore actions gated by explicit permissions. Remaining work is deeper workflow polish.
- **Integration coverage**: initial session-backed API integration coverage exists for moderation queue access, custom role assignment, and group-based private category visibility. Remaining coverage should include broader admin settings flows.
- **RBAC hardening**: category visibility assignment validation and transactional updates are implemented. Remaining hardening should keep role/group/category permission business rules in services instead of growing handler logic.
- **Downstream permission consumers**: notifications, search visibility, moderation outcomes, role-change events, and revision/edit-history visibility should consume the RBAC permission model rather than adding separate access rules.

Recommended next sequence:

1. Continue RBAC hardening by extracting heavier admin/category RBAC logic into services and broadening integration coverage.
2. Build the moderation UI/command center on top of the new report submission, queue, review, and permission-gated moderator action APIs.
3. Add focused integration coverage for authenticated user, moderator, admin, custom-role, and private-category flows.

## Recent Changes (Since M2A Completion)

The following changes landed after Milestone 2A was marked complete and represent progress toward editor migration and content model cleanup:

1. **Tiptap removal** — All Tiptap editor code, components, hooks, and `@tiptap/*` dependencies have been removed. The Slate-based `PostRichTextEditor` and `PostRichTextContent` are now the sole editor implementation. Extracted `handleImageUpload` and `MAX_FILE_SIZE` into `src/lib/upload-utils.ts`.

2. **Content model migration** — The legacy `content` field has been removed from posts and comments (migration `0003_charming_mister_fear`). Content is now stored as `bodyMarkdown` (canonical) and `bodyHtml` (derived), aligning with the PRD direction of Markdown as the canonical storage format.

3. **Upload filename hashing** — Upload handlers now hash filenames server-side instead of using original filenames directly, preventing path collisions and leaking readable filenames into storage paths.

4. **Post reply UI updates** — The thread detail page reply box received UI polish.

5. **Structured error responses** — The Hono error handling layer now uses structured HTTP error responses instead of generic error objects.

6. **Provider seams** — `src/server/lib/envs.ts` now defines the provider configuration shape for S3 and storage, and event types were updated to reflect current content model fields.

## Why M2B Should Be Next

Authorization is the highest-priority gap because:

- Permission vocabulary becomes expensive to change the longer it is deferred.
- Category visibility and moderation actions both depend on permission checks.
- The current role-only checks will not scale toward admin-configurable custom roles.
- All subsequent product features (moderation, notifications, search scope) reference permissions.

Without M2B:

- admin and moderator actions remain hardcoded to role strings,
- category visibility cannot be driven by role/group permission data,
- custom role creation in the dashboard has no runtime enforcement layer.
