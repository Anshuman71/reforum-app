# Reforum V1 Product Requirements Document

Status: Current working PRD
Last updated: 2026-05-16

## Purpose

Reforum is an open-source, self-hosted, single-community forum starter kit for teams or communities that want a modern Discourse-like discussion product without adopting a multi-tenant organization model.

The V1 product should deliver a reliable, customizable forum foundation with production-safe auth, storage, moderation, and permission controls before expanding into notifications, search, and extensibility.

## Current Assessment

Reforum is in mid Stage 2. The app has moved beyond scaffolding and has a working forum backbone:

- Users can authenticate through Better Auth.
- Posts, categories, comments, tags, and thread pages exist.
- Core post and thread behavior has been moved into a service layer.
- Cursor pagination is implemented for feeds and thread replies.
- Server-side author ownership is derived from the authenticated session.
- S3-compatible storage support and direct-upload preparation exist.
- Avatar upload and content image upload flows are present.
- ~~The current editor implementation uses Tiptap, but the product direction should move toward a lighter Markdown-first editor.~~ The Slate editor is now the active implementation; Tiptap has been fully removed. Content is stored as Markdown (canonical) and HTML (derived).
- Admin user management and permission-driven RBAC exist, including custom roles and role/group-scoped private category visibility.
- A permission-gated moderation foundation exists for user reports, queue review, and hide/delete/restore decisions.
- Event hooks exist through a lightweight serverless-safe `after()`-based event bus.

The biggest remaining gaps are product hardening gaps, not basic forum flow gaps:

- RBAC is complete at the V1 foundation level, but downstream features still need to consume the permission model consistently.
- Email now has a reusable adapter contract, shared auth-email utilities, and a Resend HTTP adapter blueprint; the default runtime config still uses the noop adapter until provider env/config is enabled.
- Notifications exist in schema/event direction but not as a complete user-facing product.
- Moderation now has reports, queue review, and action APIs/UI, but still needs workflow polish and notification outcomes.
- Strict modular boundary enforcement is still a future architecture task.
- Search, bookmarks, saved posts, and durable workflow delivery are post-foundation milestones.

## Product Positioning

Reforum V1 should prioritize being a dependable, customizable community discussion starter kit over being a generalized social platform.

Primary product promises:

- Clear discussion structure through categories and flat threads.
- Fast initial page loads with client-side interactivity where it matters.
- Production-safe file uploads through direct storage uploads.
- Simple single-tenant administration without organization complexity.
- Permission-driven moderation and administration with admin-configurable custom roles.
- A path to future extensibility through events, adapters, and hooks.
- A deployment model that works on Vercel and Docker-based VPS hosting.
- Adapter-first customization for storage, email, realtime, analytics, and future provider integrations.

Non-goals for V1:

- Multi-tenant organizations.
- Organization-scoped roles or memberships.
- Deeply nested recursive comments.
- Real-time chat-level interaction.
- Marketplace/plugin ecosystem.
- Full durable workflow infrastructure.
- SaaS billing, tenant provisioning, or hosted-community management.

## Target Users

### Community Member

A signed-in user who can create posts, reply to discussions, upload supported images, edit their own profile, and participate in the community.

### Moderator

A trusted user who can review and manage content, act on reports, and help keep the community healthy without having full system administration power.

### Admin

A site owner or operator who can manage users, roles, categories, groups, settings, and privileged operational workflows.

### Self-Hosting Developer

A developer or technical community operator who clones Reforum, configures providers, customizes the UI/product surface, adds or swaps adapters, and deploys the community to Vercel or a Docker-based VPS.

## Core User Journeys

### Browse Discussions

Users can view a paginated list of active posts, open a thread, read the post body, and browse replies without duplicate or skipped records during pagination.

### Start A Discussion

Authenticated users can create a post with a title, category, rich text body, optional tags, and supported inline media.

### Reply To A Thread

Authenticated users can add flat replies to a thread. Reply metadata may be used for contextual UI affordances, but the data model should avoid recursive thread loading.

### Manage Identity

Users can sign up, sign in, maintain a profile, and upload an avatar.

### Administer The Community

Admins can view users, change roles, manage custom roles, configure groups, configure private category audiences, and access privileged areas through permission-driven checks.

### Moderate Content

Moderators and admins can review user-submitted flags, mark reports reviewed, and hide, delete, or restore content according to explicit permissions. V1 should continue polishing queue workflows and outcomes.

## Functional Requirements

### Authentication

- Support email/password authentication through Better Auth.
- Store sessions in the database.
- Store a single global role on each user.
- Bootstrap the first admin through configured admin email behavior.
- Allow anonymous users to read public content.
- Allow open public signup.
- Keep organizations out of the runtime auth path.

### Roles And Permissions

- Keep the default global roles: `user`, `moderator`, and `admin`.
- Define explicit permission statements for posts, comments, categories, tags, groups, settings, and users.
- Allow admins to create custom roles from the dashboard by combining available permissions.
- Treat `user`, `moderator`, and `admin` as seeded default roles rather than the full long-term role system.
- Store runtime roles and role-permission assignments in the database.
- Resolve authorization from user role permissions, not from group membership.
- Use reusable server-side permission checkers for Hono handlers and service-layer logic.
- Keep sensitive direct role checks replaced by permission checks.
- Preserve ownership rules where users can manage their own content unless the product decision says otherwise.
- Remove stale organization-era auth/id surfaces that no longer match the single-tenant model.

### Forum Content

- Support active post feeds with cursor pagination.
- Support thread detail views with a primary post body and flat replies.
- Treat Markdown as the canonical authoring and storage direction.
- Keep ~~the current Tiptap implementation until the Slate migration milestone~~ using Slate as the editor implementation path.
- Use Slate as the recommended editor implementation path.
- Support a friendly editor experience without making the core content model dependent on one editor library.
- Serialize editor content to Markdown as the canonical stored body and HTML as a derived/renderable representation.
- Support images, GIFs, videos, and attachments as custom editor elements backed by the upload adapter.
- Support `@` mentions as inline mention elements that can emit mention events for notifications.
- Preserve edit history in a revisions table for posts and comments.
- Allow users to edit and delete their own content indefinitely.
- Support tags and categories.
- Keep deleted content soft-deleted through state fields.
- Avoid offset pagination for primary feeds and threads.

### Categories And Groups

- Categories organize discussions.
- Categories support private or restricted visibility in V1.
- Category visibility can be granted by role and by group membership.
- Groups are for user display, categorization, and community identity.
- Groups are not tenants and must not behave like organizations.
- Groups should not be the source of permissions for moderation, administration, or privileged actions.
- Groups may be used as category audience segments, but global permissions should continue to resolve from roles.

### Uploads And Media

- Use a storage adapter abstraction.
- Support S3-compatible direct uploads for production.
- Keep local upload support as a development fallback.
- Support avatar upload.
- Support configurable file uploads for post/comment content.
- Allow admins to configure allowed and blocked file types.
- Default to allowing images, GIFs, and videos up to 100MB.
- Validate file type, file size, and user-owned storage paths on the server.

### Email

- Keep the reusable `sendEmail` adapter contract as the email provider boundary.
- Provide provider adapters that can be swapped by self-hosters through `reforum.config.ts`.
- Use shared utilities for account verification and password reset flows rather than hard-coding one owner policy.
- Let Better Auth and project owners decide whether verified email is mandatory before posting.
- Resend is the planned default provider unless changed by product decision.

### Notifications

- Add an in-app notification center after permission hardening.
- Use cursor pagination and polling for the initial version.
- Generate events for all meaningful user, content, moderation, role, and system actions.
- Let owners use hooks/plugins/adapters to decide which events create in-app, email, webhook, or other notification outputs.
- Ship sensible default in-app notifications for replies, mentions, moderation outcomes, role changes, and system announcements.
- Keep durable queues and digest workflows out of initial V1 unless the deployment target requires them.

### Moderation

- Provide a moderation queue or command center for reports/flags.
- Support user-submitted flags in V1.
- Support a review queue for moderators and admins.
- Allow moderators and admins to act on content according to explicit permissions.
- Add workflow polish around report status, auditability, moderation outcomes, and notifications.
- Keep bans and shadowbans out of the first moderation milestone unless later moved into scope.

### Search And Discovery

- Use basic Postgres full-text search for V1.
- Keep a search repository boundary that can later support external engines.
- Bookmarks or saved posts are a later discovery feature unless explicitly moved into V1.

## Non-Functional Requirements

### Performance

- Use cursor pagination for dynamic feeds and threads.
- Avoid recursive thread queries.
- Prefer server-rendered initial loads with hydrated client interactivity.
- Keep storage uploads off the application server in production.

### Security

- Never trust client-sent authorship.
- Enforce permissions in server-side handlers and services.
- Validate upload ownership through storage path prefixes.
- Keep privileged admin/moderator actions behind explicit permissions.

### Reliability

- Use serverless-safe background execution for non-blocking event work.
- Avoid untracked background promises in request handlers.
- Add idempotency for notification and email delivery before durable retry queues.

### Architecture

- Preserve the modular monolith direction.
- Keep business logic in services rather than Hono handlers.
- Keep provider integrations behind adapters.
- Add module boundary enforcement after the core product contract is stable.
- Keep framework-specific behavior isolated enough that the core forum domain, service layer, and adapters can survive a future move away from Next.js.
- Prefer explicit interfaces for request/auth context, event dispatch, caching, and background execution instead of spreading framework runtime calls through domain logic.
- Keep Next.js-specific APIs out of domain services, permission logic, adapters, and provider contracts.
- Treat Next.js as the first interface/runtime implementation, not as the product core.
- Keep editor content contracts independent of Slate internals by storing portable Markdown and derived HTML rather than treating Slate JSON as the long-term canonical format.

### Deployment

- Support Vercel as a first-class deployment target.
- Support Docker-based VPS deployment as a first-class deployment target.
- Avoid production architecture that only works on one host.
- Document provider requirements for Postgres, object storage, email, and environment variables.

### Framework Portability

The current architecture can be moved toward framework portability, but it is not fully framework-agnostic today.

Portable or mostly portable:

- Drizzle schema and database access.
- Hono API routers and route contracts.
- Service-layer forum logic.
- Storage, email, realtime, and analytics adapters.
- Better Auth concepts, subject to framework integration details.

Currently Next-bound:

- App Router pages and layouts.
- React Server Component data-loading patterns.
- Next cookie/header helpers.
- `after()`-based serverless background execution.
- Next static file serving assumptions in local storage.
- Build/deployment behavior around Next 16.

Future portability requirement:

- Reforum should not rewrite the domain model, database schema, permission system, provider adapters, or forum services if the UI/runtime later moves to TanStack Start or another React framework.
- Framework-specific glue should live in narrow interface layers.
- Background execution should be abstracted behind an app event/runtime interface so `after()` can be swapped for a Docker/VPS-safe implementation.
- Request context, cookies, headers, cache invalidation, and local file serving should have explicit boundaries.

## Milestones

### Completed

- M1A: Core forum foundation.
- M2A: S3-compatible storage foundation.
- M2B: Permission-driven RBAC design.

Completed M2B acceptance criteria:

- [x] Permission vocabulary is finalized.
- [x] Server-side permission helper exists.
- [x] Runtime roles and role-permission assignments are database-backed.
- [x] Default roles have static fallback behavior and can be represented in the role UI without reintroducing organizations.
- [x] Admins can create custom roles and assign permissions in the dashboard.
- [x] Category visibility can be configured with roles and groups without making groups the global permission source.
- [x] Sensitive role checks are replaced by permission checks in the core admin, category, tag, upload, post/comment mutation, private category, and moderation paths.
- [x] Global single-tenant role model remains intact.
- [x] Stale organization-era leftovers are removed.

### Active

Post-RBAC product hardening.

Acceptance criteria:

- Transactional email provider can be integrated behind the email adapter; the Resend blueprint exists and runtime activation remains config-driven.
- Moderation workflows are polished beyond the foundation queue/action flow.
- In-app notifications consume forum, moderation, role, and system events.
- Search respects private category visibility and permission rules.
- Admin/category RBAC business rules are kept in services instead of growing handler logic.

### Next

1. Configure and document the Resend adapter path in `reforum.config.ts`/environment docs.
2. Moderation workflow polish, including outcome notifications and review/audit details.
3. In-app notification center and event-to-notification defaults.
4. Basic Postgres search with private-category visibility enforcement.
5. Post/comment revision history.
6. Modular boundary linting and future extensibility hooks.
7. ~~Slate-based Markdown-first editor migration.~~ Done: Slate editor is active; content is stored as Markdown (canonical) and HTML (derived).
8. ~~Private category visibility scope spike.~~ Done at the RBAC foundation level with role/group category audiences.

## Open Product Decisions

These answers are needed before this PRD can be considered final.

Answered decisions:

- Deployment target: Vercel and Docker-based VPS should both be supported.
- Audience: open-source self-hosters first; SaaS may come later.
- Public access: anonymous visitors can read public content.
- Signup policy: signup is open.
- Default roles: `user`, `moderator`, and `admin` are enough for now.
- Role direction: permissions should be modular so admins can create custom roles from the dashboard.
- Success criteria: Reforum V1 succeeds when it is a reusable starter kit that self-hosters can customize and deploy with existing or custom adapters.
- Next.js direction: keep Next-specific code minimal and isolated to runtime/interface glue.
- Email verification: provide utilities/configuration, but let Better Auth and project owners decide enforcement policy.
- Ownership: users can edit and delete their own content indefinitely.
- Revision history: posts and comments should maintain edit history through revisions.
- Moderation: V1 should include flags and review queues.
- Category visibility: private/restricted categories are desired, pending scope check.
- Groups: groups are for display and user categorization, and may be used for category visibility, but not global permissions.
- Composer: Markdown is the canonical content direction.
- Media: support configurable file uploads, with admins deciding allowed/blocked types.
- Notifications: emit events for all meaningful actions and let hooks/plugins/adapters decide outputs.
- Realtime: polling is acceptable for V1.
- Search: basic Postgres search is enough for V1.
- UI: neutral default UI composed with shadcn/ui.
- Admin settings: runtime settings such as custom roles and permission management must be editable in the UI.
- Private category visibility: access can be role-based and group-based.
- Revision visibility: edit history visibility is permission-controlled, with defaults for admins, moderators, and the author.
- Upload defaults: images, GIFs, and videos up to 100MB.
- Admin settings scope: revisit iteratively as product work progresses.
- Editor implementation: Slate is the recommended direction because it supports custom elements, app-defined HTML/Markdown serialization, media nodes, and inline mentions while fitting a Markdown-first OSS starter kit.
- ~~Editor sequencing: keep Tiptap for now and move Slate into the next milestone set.~~ Done: Tiptap removed; Slate is now the active editor.
- RBAC completion: M2B is complete at the foundation level; remaining RBAC work is hardening and downstream feature consumption.

Remaining decisions:

1. Admin settings: revisit concrete runtime setting scope as each feature area is implemented.

## Risks

- Permission vocabulary can still become expensive to change as downstream notifications, search, revision visibility, and moderation outcomes adopt it.
- Moderation scope can grow quickly unless the first workflow is tightly defined.
- Email and notification requirements depend heavily on deployment and provider choices.
- Group/category access can accidentally become a tenant model if boundaries are not explicit.
- ~~Editor choice can create long-term migration cost if content storage is tied too tightly to Tiptap JSON.~~ Tiptap has been removed; content is now stored as Markdown (canonical) and HTML (derived), reducing editor lock-in.
- Framework portability will be harder later if Next-specific APIs continue leaking into services and adapters.
- Admin-configurable custom roles now use a database-backed role/permission model; the remaining risk is keeping business rules centralized as admin features expand.

## PRD Finalization Checklist

- Answer open product decisions.
- Convert accepted answers into requirements.
- Mark deferred features explicitly as post-V1.
- Attach acceptance criteria to each active milestone.
- Review the PRD against `docs/v1-design.md`, `docs/users.md`, and `docs/v1-status-audit.md`.
