import { after } from 'next/server';
import type {
  BeforeEventMap,
  AfterEventMap,
  BeforeEventName,
  AfterEventName,
} from './event-types';

// --------------------------------------------------------
// Hook types
// --------------------------------------------------------

type BeforeHook<E extends BeforeEventName> = (
  ctx: BeforeEventMap[E]
) => Promise<BeforeEventMap[E]> | BeforeEventMap[E];

type AfterHook<E extends AfterEventName> = (
  ctx: AfterEventMap[E]
) => Promise<void> | void;

// --------------------------------------------------------
// Registry
// --------------------------------------------------------

const beforeRegistry = new Map<string, Array<BeforeHook<any>>>();
const afterRegistry = new Map<string, Array<AfterHook<any>>>();

// --------------------------------------------------------
// Registration
// --------------------------------------------------------

/**
 * Register a before hook. Before hooks run synchronously in FIFO order
 * before the DB write. Each hook receives the context from the previous
 * hook and must return the (possibly modified) context. Throw to reject
 * the operation.
 */
export function onBeforeEvent<E extends BeforeEventName>(
  event: E,
  hook: BeforeHook<E>
): void {
  const hooks = beforeRegistry.get(event) ?? [];
  hooks.push(hook);
  beforeRegistry.set(event, hooks);
}

/**
 * Register an after hook. After hooks run fire-and-forget via Next.js
 * after() once the DB write is committed and the response is sent.
 * Errors are logged to console, never propagated.
 */
export function onAfterEvent<E extends AfterEventName>(
  event: E,
  hook: AfterHook<E>
): void {
  const hooks = afterRegistry.get(event) ?? [];
  hooks.push(hook);
  afterRegistry.set(event, hooks);
}

/**
 * Convenience function to register both a before and after hook
 * for an entity lifecycle. Useful when a feature needs both.
 */
export function onEvent<B extends BeforeEventName, A extends AfterEventName>(
  events: { before?: B; after?: A },
  hooks: {
    before?: BeforeHook<B>;
    after?: AfterHook<A>;
  }
): void {
  if (events.before && hooks.before) {
    onBeforeEvent(events.before, hooks.before);
  }
  if (events.after && hooks.after) {
    onAfterEvent(events.after, hooks.after);
  }
}

// --------------------------------------------------------
// Emission
// --------------------------------------------------------

/**
 * Emit a before event. Runs all registered hooks in FIFO order,
 * chaining the returned context. If a hook throws, the error
 * propagates to the caller (rejecting the operation).
 *
 * Returns the final context after all hooks have run.
 * If no hooks are registered, returns the original context (no-op).
 */
export async function emitBeforeEvent<E extends BeforeEventName>(
  event: E,
  ctx: BeforeEventMap[E]
): Promise<BeforeEventMap[E]> {
  const hooks = beforeRegistry.get(event);
  if (!hooks || hooks.length === 0) return ctx;

  let current = ctx;
  for (const hook of hooks) {
    current = await hook(current);
  }
  return current;
}

/**
 * Emit an after event. Schedules all registered hooks to run
 * fire-and-forget via Next.js after(). The function returns
 * immediately — hooks execute after the HTTP response is sent.
 *
 * Each hook runs independently. If one throws, the error is logged
 * and the remaining hooks still execute.
 *
 * If no hooks are registered, this is a no-op.
 */
export function emitAfterEvent<E extends AfterEventName>(
  event: E,
  ctx: AfterEventMap[E]
): void {
  const hooks = afterRegistry.get(event);
  if (!hooks || hooks.length === 0) return;

  try {
    after(async () => {
      for (const hook of hooks) {
        try {
          await hook(ctx);
        } catch (error) {
          console.error(
            `[reforum] After hook failed for ${event}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    });
  } catch {
    // after() throws if called outside a request context (e.g., CLI, tests).
    // Fall back to a detached promise — safe in long-lived Node processes.
    void (async () => {
      for (const hook of hooks) {
        try {
          await hook(ctx);
        } catch (error) {
          console.error(
            `[reforum] After hook failed for ${event}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    })();
  }
}

// --------------------------------------------------------
// Testing utilities
// --------------------------------------------------------

/**
 * Remove all registered hooks. Use in tests (beforeEach) to
 * ensure test isolation.
 */
export function clearHooks(): void {
  beforeRegistry.clear();
  afterRegistry.clear();
}
