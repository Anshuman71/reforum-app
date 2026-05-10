# AGENTS.md

## Rules

## Context Discipline

- Keep context minimal. Read only files directly relevant to the task.
- Do not scan the whole repository unless explicitly needed.
- Prefer targeted file inspection over broad exploration.
- Before editing, identify the smallest set of files required.
- Avoid loading generated files, build artifacts, lockfiles, logs, and large snapshots unless necessary.

## Workflow

- For non-trivial tasks, make a short plan before coding.
- Ask only when blocked by missing requirements.
- Prefer small, focused changes over broad refactors.
- Do not rewrite entire files when a localized diff is enough.
- Preserve existing architecture, naming, and style.
- Never run build commands without permissions.
- Never install dependencies without permissions.

## Output

- Keep responses concise.
- Summarize what changed and how it was verified.
- Do not include large code dumps unless requested.
- Mention only relevant files and commands.

## Verification

- Run the narrowest relevant test, lint, or typecheck command.
- If checks cannot be run, state why and what should be run manually.

## Done Criteria

- The requested behavior is implemented.
- The diff is minimal and reviewable.
- Relevant checks pass or the verification gap is clearly stated.

## Project Context

## Architecture

- **Frontend**: Next.js 16 App Router, React 19, TanStack Query, shadcn/ui, Tiptap editor for now; Slate Markdown-first editor is planned next
- **API**: Hono with @hono/zod-openapi and stoker, mounted via Next.js catch-all route
- **Database**: PostgreSQL with Drizzle ORM (single-tenant, no multi-org)
- **Auth**: better-auth with email/password, role-based access (user/moderator/admin)
- **Storage**: S3-compatible adapter (presigned URLs) with local filesystem fallback for dev
- **Email**: Noop adapter (no provider integrated yet; Resend planned)
- **Realtime**: Polling adapter (no SSE/WebSocket yet)

## Directory Structure

- `src/app/` — Next.js pages (App Router): `(auth)/`, `admin/`, `api/`, `d/`, `simple/`
- `src/components/` — React components: `auth/`, `common/`, `posts/`, `ui/`, tiptap extensions
- `src/hooks/` — React hooks (editor, scrolling, responsive, throttling)
- `src/lib/` — Client-side utilities (auth-client, tiptap-utils, utils)
- `src/server/db/` — Drizzle schema (`schema.ts`) and DB connection (`index.ts`)
- `src/server/api/` — Hono routers: `admin/`, `categories/`, `comments/`, `posts/`, `tags/`, `uploads/`
- `src/server/services/` — Service layer (`forum.ts`) extracted from handlers
- `src/server/lib/` — Server utilities: auth, config, envs, events, id, permissions
- `src/server/common/` — Shared Hono setup: create-app, middlewares, constants, OpenAPI config
- `src/server/errors/` — Error handling and OpenAPI error schemas
- `src/server/api-auth/` — Authorization helpers (role-based, `isAuthorized`)
- `src/server/adapters/` — Pluggable adapters: `storage/` (local, s3), `email/` (noop), `realtime/` (polling), `analytics/` (console)
- `src/server/features/` — Feature hook registrations (`admin-setup/`)
- `src/server/zod-error.ts` — Shared Zod error formatting
- `drizzle/` — Database migrations

## Docs Routing

- Product direction, feature requirements, milestones, and open decisions: `docs/prd.md`
- Current implementation status and milestone progress: `docs/v1-status-audit.md`
- Auth, users, RBAC, roles, groups, and single-tenant decisions: `docs/users.md`
- Original V1 architecture and long-term roadmap blueprint: `docs/v1-design.md`
- Before changing auth, permissions, roles, groups, or category visibility, read `docs/prd.md` and `docs/users.md`.
- Before changing editor/content storage, uploads/media, notifications, moderation, or search, read the matching section in `docs/prd.md`.
- Before changing architecture boundaries, adapters, serverless behavior, or deployment assumptions, read `docs/prd.md` and `docs/v1-design.md`.

## API Pattern

Each API resource has 3 files:

- `[resource].routes.ts` — OpenAPI route definitions with Zod schemas
- `[resource].handlers.ts` — Route handler implementations
- `[resource].index.ts` — Router initialization

Business logic should live in `src/server/services/` rather than directly in handlers.

## Key Conventions

- Environment variables: always use `getEnvs()` from `@/server/lib/envs`, import `server-only`
- IDs: generated via `newId(model)` from `@/server/lib/id` with prefix-based format
- Auth: role hierarchy is admin > moderator > user today; active direction is database-backed permission checks
- Schema: single-tenant, no communityId on any table
- Storage: use adapter pattern from `src/server/adapters/storage/`; presigned URLs for production uploads
- Events: use `src/server/lib/events.ts` event bus with `after()` for serverless-safe background work
- Services: extract business logic into `src/server/services/`, keep handlers thin
- Framework portability: keep Next.js-specific APIs in runtime/interface glue, not in services, permission logic, or adapters

## Project Status

- **Current stage**: Late Stage 1 (v1-design.md)
- **Completed milestones**: M1A (Core forum foundation), M2A (S3-compatible storage foundation)
- **Active milestone**: M2B (Permission-driven RBAC design)
- **Key gaps**: Email provider integration, permission-based RBAC enforcement, modular boundary linting
- See `docs/prd.md` for the current product requirements, milestones, and feature list
- See `docs/v1-status-audit.md` for detailed progress tracking
- See `docs/users.md` for auth and RBAC architecture decisions (single-tenant, no orgs)
- See `docs/v1-design.md` for the full v1 design blueprint
