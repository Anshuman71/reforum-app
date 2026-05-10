# Users, Auth, and RBAC

This document describes how users are currently modeled in Reforum, how authentication works, what RBAC looks like today, and whether organizations are still needed.

## Short Answer

No, we do **not** need organizations for RBAC in the current app.

The app is currently structured as a **single-tenant community**:

- one shared user base,
- one global role per user,
- no org membership resolution,
- no organization-scoped permissions in the runtime auth path.

RBAC is handled directly from the `users.role` column.

## Current User Model

The core Better Auth user record lives in the `users` table in [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:19).

Current fields:

- `id`
- `name`
- `email`
- `emailVerified`
- `image`
- `role`
- `createdAt`
- `updatedAt`

### Role Model

Each user has a single global role stored directly on the user row:

- `user`
- `moderator`
- `admin`

This means the permission model is **platform-wide**, not scoped per organization, team, or tenant.

## Better Auth Tables In Use

The auth-related tables currently present in schema are:

- `users` in [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:19)
- `sessions` in [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:33)
- `accounts` in [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:48)
- `verifications` in [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:68)
- `apikeys` in [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:80)
- `rate_limits` in [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:106)

Notably absent from the active schema:

- `organizations`
- `members`
- `invitations`

So from the database point of view, the current schema is already largely de-organized.

## Authentication Flow

The main Better Auth server configuration is in [src/server/lib/auth.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/lib/auth.ts:10).

Current behavior:

- Better Auth is configured with `emailAndPassword`.
- The Drizzle adapter writes directly to the local auth tables.
- Custom IDs are generated through `newId(...)`.
- Cookies are enabled via `nextCookies()`.
- On signup, a `user:afterSignup` event is emitted.

Important detail:

- There is **no organization plugin** configured in the current Better Auth setup.
- There is **no org-scoped auth resolution** happening in the auth config.

## Runtime Session and Current User Resolution

Request auth is resolved in [src/server/common/middlewares.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/common/middlewares.ts:8).

The flow is:

1. Read the Better Auth session from request headers.
2. If there is no session, set `user = null` and `session = null`.
3. If there is a session, look up the user’s `role` directly from the `users` table.
4. Attach the merged user object to the Hono context.

This is the key single-tenant behavior:

- the app does **not** load a role through an organization membership table,
- the app does **not** evaluate org membership,
- the app does **not** switch context based on tenant or community.

The comment in that middleware explicitly reflects this:

- “single-tenant, no org layer”

## RBAC Structure

The RBAC helper is in [src/server/api-auth/index.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/api-auth/index.ts:1).

Current hierarchy:

- `admin` > `moderator` > `user`

This is implemented as a simple numeric comparison:

- `user = 0`
- `moderator = 1`
- `admin = 2`

`isAuthorized(c, requiredRole)`:

- throws `UNAUTHORIZED` if the user is not signed in,
- throws `FORBIDDEN` if the signed-in user does not meet the required role level.

This is global RBAC, not org RBAC.

## Admin Bootstrap

The app currently bootstraps the first admin by email in [src/server/features/admin-setup/register.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/features/admin-setup/register.ts:6).

Current behavior:

- after signup,
- if the new user’s email matches `ADMIN_EMAIL`,
- their `users.role` is updated to `admin`.

Again, this is global community-level admin assignment, not organization ownership.

## User Profiles Structure

Profile data is split from the main auth user row into `user_profiles` in [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:329).

Current profile fields:

- `userId`
- `bio`
- `website`
- `location`
- `lastSeenAt`
- `createdAt`
- `updatedAt`

There is a one-to-one relation from `users` to `user_profiles` in [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:578).

So the current user model is effectively:

- `users`: auth identity + role + avatar/name/email
- `user_profiles`: extended public/community profile fields

## Groups vs Organizations

The schema still has:

- `groups`
- `user_groups`
- `category_groups`

in [src/server/db/schema.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/db/schema.ts:349).

These are **not organizations**.

Based on the current schema, they look more like:

- audience/access grouping,
- category visibility control,
- community segmentation inside the same single tenant.

That is different from a multi-tenant organization model.

So:

- `groups` may still be useful,
- `organizations` are not required for the current RBAC model.

## Current Community User Handling

At a high level, users in the community are handled like this:

1. A person signs up through Better Auth.
2. A row is created in `users`.
3. Better Auth manages sessions in `sessions`.
4. The app resolves the current user from the session.
5. The app reads the global `users.role`.
6. That role controls privileged behavior across the whole app.
7. Optional extended profile data can live in `user_profiles`.

Content ownership also points directly to users:

- `posts.authorId`
- `comments.authorId`
- `votes.userId`
- `reactions.userId`
- `bookmarks.userId`
- `uploads.userId`
- `notifications.userId`
- `flags.reporterId`

This is a straightforward single-community model.

## Do We Still Need Organizations?

For the current app direction: **no**.

Organizations would only be needed if we wanted things like:

- multiple isolated communities in one deployment,
- org-specific admins/moderators,
- tenant-scoped categories, content, and settings,
- user membership varying by org.

None of that is how the current runtime works today.

## Remaining Cleanup Worth Doing

Even though the active auth/runtime path is already single-tenant, there is still one obvious cleanup item:

- [src/server/lib/id.ts](/Users/anshumanbhardwaj/Documents/work/reforum-app/src/server/lib/id.ts:28) still includes stale Better Auth prefixes for `member`, `organization`, and `invitation`.

That does not mean org RBAC is active, but it is leftover support surface from the old model and should be cleaned up so the code matches the product direction more closely.

## Practical Conclusion

The current app already behaves like a single-tenant community platform.

Today’s structure is:

- Better Auth for identity and sessions,
- one global `users.role` for RBAC,
- one optional `user_profiles` row for extended profile data,
- no organization dependency in active auth or authorization flow.

If we continue in this direction, the next step is not to add organizations back. The next step is to finish removing stale org-era leftovers and keep permissions centered on:

- global roles,
- optional group/category access rules,
- direct content ownership.
