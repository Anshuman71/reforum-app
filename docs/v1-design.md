Here is the fully updated master plan for Reforum, integrating the serverless safeguards, database optimization strategies, and strict architectural boundaries.

This version serves as a comprehensive, execution-ready blueprint.

---

## **Reforum: The Modular Monolith Community Engine**

**Architectural Goal:** A high-performance, self-hosted Discourse alternative balancing development speed with serverless-native scale. Built on a Modular Monolith pattern to enforce strict domain boundaries while maintaining a single source of truth.

### **I. Comprehensive Feature Outline**

**1. Core Community Pillars**

- **Unified Posting Engine:** Hierarchical categories with **strictly flat threads**. Deep nesting is avoided to prevent recursive database queries. "Replies" are handled via a `reply_to_post_id` metadata column for UI contextual rendering (quotes/popovers).
- **Dual-Interface Delivery:** Optimized SEO via React Server Components (RSC) for initial loads, paired with a responsive Internal REST API (Hono) for client-side interactions.
- **Markdown Composer:** Clean rich-text environment with Markdown media embeds and S3-compatible file attachments.
- **Cursor-Based Pagination:** Core primitive for all feeds and threads. Prevents duplicate or dropped records during high-velocity thread updates, entirely replacing `OFFSET/LIMIT`.

**2. Management & Governance**

- **Unified Identity:** Comprehensive authentication via Better-Auth with Email Verification and RBAC.
- **Backoffice Triage:** Centralized moderation command center for post flagging and shadowbanning.
- **Role-Based Access:** Declarative security enforcing permissions at both the UI (RSC) and Service layers.

**3. Critical Infrastructure**

- **Database Connection Pooling:** Mandatory connection pooling via Neon’s Serverless Driver (HTTP/WebSockets) or PgBouncer to prevent connection exhaustion from serverless compute instances.
- **Transactional Email:** Integration with Resend for verification, password resets, and alerts.
- **Durable Notifications:** In-app feed and system alerts, utilizing serverless-safe background execution (`Next.js after()` or `waitUntil`) to prevent dropped tasks.
- **Serverless Storage:** Distributed file management using Cloudflare R2 (or AWS S3) strictly via **Presigned URLs** to keep bandwidth and credentials off the application server.

---

### **II. Architectural Principles & Boundaries**

**1. Folder Structure & Bounded Contexts**
Domain isolation is enforced not just by folder structure, but at the compiler/linter level (e.g., `eslint-plugin-boundaries`). Modules must never cross-import internal logic; they communicate strictly via exported interfaces or the global event bus.

- `/core`: Shared service layer, repository interfaces, and the global event bus.
- `/features`: Self-contained, isolated modules (`/posts`, `/auth`, `/notifications`, `/media`).
- `/interfaces`: Explicit boundary for RSC pages and HTTP (Hono) handlers.
- `/lib`: Utility integrations for DB (Drizzle), Auth (Better-Auth), Email (Resend), and Storage (S3/R2).

**2. Aggressive Caching Strategy**
To minimize compute and database load, read-heavy operations are heavily cached and selectively invalidated via the Event Bus.

| Resource Level        | Read Strategy                           | Invalidation Trigger (Event Bus)    |
| :-------------------- | :-------------------------------------- | :---------------------------------- |
| **Categories/Topics** | Next.js RSC Cached (Tag: `categories`)  | `topic.created`, `topic.updated`    |
| **Thread Posts**      | Next.js RSC Cached (Tag: `thread:[id]`) | `post.created`, `post.deleted`      |
| **Active User Feed**  | Client-Side SWR / React Query           | Real-time polling / SSE / WebSocket |
| **User Profiles**     | Stale-While-Revalidate (SWR)            | `user.updated`                      |

---

### **III. The Master Engineering Roadmap**

#### **Stage 1: The Foundation (MVP)**

**Objective:** A usable forum engine with core infrastructure safely configured for serverless scaling.

- **Milestone 1: Logic, Service, & DB Scaffolding (P0)**
  - Initialize monorepo with strict linting boundaries for `/features`.
  - Configure Neon Postgres with Serverless Connection Pooling.
  - Build core Services (`createPost`, `createTopic`) utilizing Cursor-Based Pagination.
  - Set up Better-Auth with Resend integration.
- **Milestone 2: Media & Storage Foundation (P0)**
  - Configure Cloudflare R2/S3 in `lib/storage`.
  - Implement Avatar Uploads: Hono route generates presigned URLs; client-side direct upload.
- **Milestone 3: Serverless-Safe Event Scaffolding (P0)**
  - Define `notifications` schema.
  - Deploy Synchronous Event Bus Placeholder using `Next.js after()` (or `waitUntil`) to guarantee background execution without blocking the main thread or dropping promises.

#### **Stage 2: UX & Interactivity**

**Objective:** Modern responsiveness and an in-app engagement feed.

- **Milestone 4: The Notification Center**
  - Build Next.js In-App Notification Center via TanStack Query (Cursor-paginated polling).
  - Implement User Mention (`@user`) logic via the event bus.
- **Milestone 5: Media Enhancements**
  - Integrate Markdown Media Embeds into the composer using Stage 2 storage logic.

#### **Stage 3: Search & Discovery**

**Objective:** Discoverable content at scale.

- **Milestone 6: Intelligent Search**
  - Implement Full-Text Search using Postgres `tsvector`.
  - Design the search repository interface to allow seamless future swapping to Meilisearch/Elasticsearch.
  - Create bookmarking/saved posts functionality.

#### **Stage 4: Extensibility Foundation**

**Objective:** Modular extension capabilities.

- **Milestone 7: Hook System & Providers**
  - Build internal Hook System (`hooks.onNotificationSend`).
  - Enable Third-Party Providers: Refactor `/lib` utilities to support swappable providers (e.g., Resend to SendGrid).

#### **Stage 5: Platform & Durable Workflow Capabilities**

**Objective:** Scale infrastructure with durable batching and delivery guarantees.

- **Milestone 8: Durable Notification Engine**
  - Migrate Event Bus to Upstash QStash.
  - Implement the **Outbox Pattern**: Write events to an `outbox` table within the Postgres transaction to guarantee delivery to QStash despite network failures.
  - Implement Durable Workflows for Notification Batching (e.g., daily digest emails).
- **Milestone 9: External Webhooks**
  - Build a Webhook Registry allowing admins to push events (`topic.created`) to external endpoints with 100% QStash delivery guarantees.

---

### **IV. Critical Guardrails**

1.  **Direct Uploads Only:** Never stream files through application servers (Vercel/Cloudflare). Always use Presigned URLs to bypass memory and timeout constraints.
2.  **No Dangling Promises:** Background logic must never rely on standard `Promise.all` in the handler. Always wrap non-blocking background work in serverless-native lifecycle methods (`after()` / `waitUntil`).
3.  **Strictly Flat Threads:** Reject recursive database models (`parent_id`) for posts. Maintain O(1) read complexity by using flat tables and handling visual quoting purely via metadata (`reply_to_post_id`).
4.  **Idempotency:** Email and notification handlers must utilize Idempotency Keys to prevent duplicate deliveries during Stage 5 QStash queue retries.

---

To ensure the caching and real-time strategies outlined here align perfectly with your exact infrastructure limits, what is your primary deployment target for the Next.js and Hono layers (e.g., Vercel, Cloudflare Pages, AWS ECS), and do you anticipate needing heavy real-time features like "user is typing" indicators in the near future?
