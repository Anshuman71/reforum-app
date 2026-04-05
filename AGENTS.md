# Reforum

An open-source community/forum platform. Standalone Next.js app with shadcn-style distribution.

## Architecture

- **Frontend**: Next.js 15 App Router, React 19, TanStack Query, shadcn/ui, Tiptap editor
- **API**: Hono with @hono/zod-openapi mounted via Next.js catch-all route
- **Database**: PostgreSQL with Drizzle ORM (single-tenant, no multi-org)
- **Auth**: better-auth with email/password, role-based access (user/moderator/admin)

## Directory Structure

- `src/app/` — Next.js pages (App Router)
- `src/components/` — React components (ui/, posts/, comments/, editor/, common/)
- `src/hooks/` — React hooks
- `src/lib/` — Client-side utilities
- `src/server/db/` — Drizzle schema and DB connection
- `src/server/api/` — Hono routers (posts/, comments/, categories/, tags/)
- `src/server/lib/` — Server utilities (auth, id generation, permissions, envs)
- `src/server/common/` — Shared Hono setup (create-app, middlewares, constants)
- `src/server/errors/` — Error handling and OpenAPI error schemas
- `src/server/api-auth/` — Authorization helpers (role-based)
- `src/server/adapters/` — Pluggable adapters (realtime/, storage/, analytics/)
- `src/server/features/` — Feature hook registrations
- `drizzle/` — Database migrations

## API Pattern

Each API resource has 3 files:
- `[resource].routes.ts` — OpenAPI route definitions with Zod schemas
- `[resource].handlers.ts` — Route handler implementations
- `[resource].index.ts` — Router initialization

## Key Conventions

- Environment variables: always use `getEnvs()` from `@/server/lib/envs`, import `server-only`
- IDs: generated via `newId(model)` from `@/server/lib/id` with prefix-based format
- Auth: role hierarchy is admin > moderator > user. Use `isAuthorized(c, 'admin')` for role checks
- Schema: single-tenant, no communityId on any table
