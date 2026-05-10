# Reforum V1 Status Audit

Reference design: [v1-design.md](./v1-design.md)

## Current Stage

The codebase is currently in **late Stage 1**, with most of **Milestone 1** completed, **Milestone 3** partially scaffolded, and the project approaching the first infrastructure-heavy milestone.

In practical terms:

- There is already a working vertical slice for auth, posts, categories, comments, and some admin tooling.
- The app is beyond raw scaffolding and now has a more reliable forum backbone.
- The biggest remaining gap is no longer basic forum flow; it is production-grade infrastructure around storage, permissions, and provider-backed integrations.

## What Exists Today

### Working foundation pieces

- Better Auth is wired with DB-backed sessions and custom ID generation.
- RBAC exists and is enforced in admin flows.
- Posts, comments, categories, tags, admin users, and basic forum pages are present.
- There is already a lightweight event hook system using `after()`.
- The database schema includes several future-facing tables such as notifications, flags, uploads, bookmarks, votes, and reactions.
- Core forum logic now lives in a service layer instead of only inside Hono handlers.
- Cursor pagination is implemented for post feeds and thread replies.
- Thread detail rendering is now functional instead of placeholder-only.
- The server no longer trusts client-sent authorship for post and comment creation.
- Provider seams now exist for email and storage adapters.

### Evidence in the codebase

- Auth setup: [src/server/lib/auth.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/lib/auth.ts:9)
- Auth middleware: [src/server/common/middlewares.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/common/middlewares.ts:8)
- RBAC helper: [src/server/api-auth/index.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/api-auth/index.ts:17)
- Permission map draft: [src/server/lib/permissions.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/lib/permissions.ts:1)
- Event bus placeholder: [src/server/lib/events.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/lib/events.ts:116)
- Main schema: [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:19)
- Posts page: [src/app/page.tsx](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/app/page.tsx:9)
- Create post UI: [src/components/posts/CreatePostModal.tsx](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/components/posts/CreatePostModal.tsx:39)
- Posts handlers: [src/server/api/posts/posts.handlers.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/api/posts/posts.handlers.ts:35)
- Forum services: [src/server/services/forum.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/services/forum.ts:1)
- Thread page: [src/components/posts/PostDetailPage.tsx](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/components/posts/PostDetailPage.tsx:1)

## Gap Against The V1 Design

The following parts of the design are still incomplete or not aligned with the intended architecture.

### Milestone 1 gaps

- Better Auth exists, but Resend/email integration is not yet present.
- No strict modular boundaries are enforced yet as described in the design.
- Permission-based RBAC is not yet the primary enforcement layer; current runtime checks are still mostly role-based.

### Milestone 2 and infra gaps

- Serverless storage via presigned URLs is not implemented.
- Current storage adapter is local filesystem based, which is useful for development but not aligned with the serverless design.
- No S3-compatible storage adapter exists yet.
- Avatar upload flow is not implemented yet.

### Partial alignment issues

- The design calls for strictly flat threads with reply metadata handled as a lightweight reference pattern.
- The current schema uses `replyToCommentId` on comments, which is workable, but it is not a clean match for the target model described in the design.
- There are still stale org-era leftovers in auth support code, such as unused organization/member/invitation ID prefixes.

## Honest Status Summary

The project is best described as:

**A functioning forum foundation that now needs infrastructure and authorization hardening.**

That means:

- usable for internal iteration,
- strong enough to support storage and notification work,
- close to calling Milestone 1 complete from an application-flow perspective,
- not yet ready to call the platform foundation complete.

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
- storage infrastructure,
- stronger permission-driven RBAC,
- stricter modular boundaries.

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

The next best target is now authorization hardening.

## Follow-Up Milestone

## Milestone 2B: Permission-Driven RBAC Design

Goal: shift authorization from mainly role-name checks to explicit permission checks aligned with the app’s single-tenant model.

### TODOs

- [ ] `R1` Finalize the permission vocabulary in `src/server/lib/permissions.ts`.
- [ ] `R2` Decide the initial custom roles beyond `user`, `moderator`, and `admin` if needed.
- [ ] `R3` Add a reusable server-side permission-check helper for services and route handlers.
- [ ] `R4` Replace direct role branching in sensitive flows with permission-based checks where appropriate.
- [ ] `R5` Keep global roles on `users.role`; do not reintroduce organizations for RBAC.
- [ ] `R6` Remove stale org-era auth leftovers that no longer match the single-tenant direction.

## Why This Should Be First

Storage is the best next step because the forum foundation is now stable enough to support it, and the v1 design treats direct uploads as a hard infrastructure guardrail.

Without this step:

- media work stays blocked on local filesystem assumptions,
- avatars and richer composer uploads cannot move to a production-safe path,
- later notification and moderation features still lack the real-world infrastructure base they expect.

With Milestone 2A complete, the codebase will be in a much better position to move into notification center work, media enhancements, and stronger authorization design safely.
