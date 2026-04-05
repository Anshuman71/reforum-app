import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server's after() before importing events
vi.mock('next/server', () => ({
  after: (fn: () => Promise<void>) => {
    // In tests, execute immediately instead of deferring
    void fn();
  },
}));

import {
  onBeforeEvent,
  onAfterEvent,
  emitBeforeEvent,
  emitAfterEvent,
  clearHooks,
} from '@/server/lib/events';

beforeEach(() => {
  clearHooks();
});

// --------------------------------------------------------
// Before hooks
// --------------------------------------------------------

describe('emitBeforeEvent', () => {
  it('returns original context when no hooks registered', async () => {
    const ctx = {
      data: { title: 'Hello', content: 'World', authorId: 'u1', categoryId: 'c1', tags: [] },
      actor: { id: 'u1', role: 'user' },
      meta: {},
    };

    const result = await emitBeforeEvent('post:beforeCreate', ctx);
    expect(result).toEqual(ctx);
  });

  it('returns modified context from a single hook', async () => {
    onBeforeEvent('post:beforeCreate', async (ctx) => ({
      ...ctx,
      data: { ...ctx.data, title: 'Modified' },
    }));

    const result = await emitBeforeEvent('post:beforeCreate', {
      data: { title: 'Original', content: 'Body', authorId: 'u1', categoryId: 'c1', tags: [] },
      actor: { id: 'u1', role: 'user' },
      meta: {},
    });

    expect(result.data.title).toBe('Modified');
  });

  it('chains multiple hooks in FIFO order', async () => {
    onBeforeEvent('post:beforeCreate', async (ctx) => ({
      ...ctx,
      data: { ...ctx.data, title: ctx.data.title + ' [A]' },
    }));

    onBeforeEvent('post:beforeCreate', async (ctx) => ({
      ...ctx,
      data: { ...ctx.data, title: ctx.data.title + ' [B]' },
    }));

    const result = await emitBeforeEvent('post:beforeCreate', {
      data: { title: 'Start', content: 'Body', authorId: 'u1', categoryId: 'c1', tags: [] },
      actor: { id: 'u1', role: 'user' },
      meta: {},
    });

    expect(result.data.title).toBe('Start [A] [B]');
  });

  it('propagates error when a hook throws (rejects operation)', async () => {
    onBeforeEvent('post:beforeCreate', async () => {
      throw new Error('Spam detected');
    });

    await expect(
      emitBeforeEvent('post:beforeCreate', {
        data: { title: 'Spam', content: 'Buy now', authorId: 'u1', categoryId: 'c1', tags: [] },
        actor: { id: 'u1', role: 'user' },
        meta: {},
      })
    ).rejects.toThrow('Spam detected');
  });

  it('stops chain on first throwing hook', async () => {
    const secondHook = vi.fn(async (ctx: any) => ctx);

    onBeforeEvent('post:beforeCreate', async () => {
      throw new Error('Rejected');
    });

    onBeforeEvent('post:beforeCreate', secondHook);

    await expect(
      emitBeforeEvent('post:beforeCreate', {
        data: { title: 'Test', content: 'Body', authorId: 'u1', categoryId: 'c1', tags: [] },
        actor: { id: 'u1', role: 'user' },
        meta: {},
      })
    ).rejects.toThrow('Rejected');

    expect(secondHook).not.toHaveBeenCalled();
  });

  it('supports meta bag for cross-hook communication', async () => {
    onBeforeEvent('post:beforeCreate', async (ctx) => ({
      ...ctx,
      meta: { ...ctx.meta, validated: true },
    }));

    onBeforeEvent('post:beforeCreate', async (ctx) => {
      expect(ctx.meta.validated).toBe(true);
      return ctx;
    });

    await emitBeforeEvent('post:beforeCreate', {
      data: { title: 'Test', content: 'Body', authorId: 'u1', categoryId: 'c1', tags: [] },
      actor: { id: 'u1', role: 'user' },
      meta: {},
    });
  });
});

// --------------------------------------------------------
// After hooks
// --------------------------------------------------------

describe('emitAfterEvent', () => {
  it('is a no-op when no hooks registered', () => {
    // Should not throw
    emitAfterEvent('post:afterCreate', {
      entity: { id: 'p1' } as any,
      actor: { id: 'u1', role: 'user' },
      meta: {},
    });
  });

  it('executes registered hooks', async () => {
    const handler = vi.fn();

    onAfterEvent('post:afterCreate', handler);

    emitAfterEvent('post:afterCreate', {
      entity: { id: 'p1', title: 'Test' } as any,
      actor: { id: 'u1', role: 'user' },
      meta: {},
    });

    // after() mock executes immediately via void fn()
    // Give the microtask queue a tick
    await new Promise((r) => setTimeout(r, 10));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: expect.objectContaining({ id: 'p1' }),
        actor: { id: 'u1', role: 'user' },
      })
    );
  });

  it('logs error but does not throw when a hook fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    onAfterEvent('post:afterCreate', async () => {
      throw new Error('Notification failed');
    });

    // Should not throw
    emitAfterEvent('post:afterCreate', {
      entity: { id: 'p1' } as any,
      actor: { id: 'u1', role: 'user' },
      meta: {},
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[reforum]'),
      expect.stringContaining('Notification failed')
    );

    consoleSpy.mockRestore();
  });

  it('continues executing remaining hooks after one fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const secondHook = vi.fn();

    onAfterEvent('post:afterCreate', async () => {
      throw new Error('First hook fails');
    });

    onAfterEvent('post:afterCreate', secondHook);

    emitAfterEvent('post:afterCreate', {
      entity: { id: 'p1' } as any,
      actor: { id: 'u1', role: 'user' },
      meta: {},
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(secondHook).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('runs multiple hooks in FIFO order', async () => {
    const order: string[] = [];

    onAfterEvent('post:afterCreate', async () => {
      order.push('first');
    });

    onAfterEvent('post:afterCreate', async () => {
      order.push('second');
    });

    emitAfterEvent('post:afterCreate', {
      entity: { id: 'p1' } as any,
      actor: { id: 'u1', role: 'user' },
      meta: {},
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(order).toEqual(['first', 'second']);
  });
});

// --------------------------------------------------------
// clearHooks
// --------------------------------------------------------

describe('clearHooks', () => {
  it('removes all registered hooks', async () => {
    const handler = vi.fn(async (ctx: any) => ctx);

    onBeforeEvent('post:beforeCreate', handler);
    onAfterEvent('post:afterCreate', vi.fn());

    clearHooks();

    const result = await emitBeforeEvent('post:beforeCreate', {
      data: { title: 'Test', content: 'Body', authorId: 'u1', categoryId: 'c1', tags: [] },
      actor: { id: 'u1', role: 'user' },
      meta: {},
    });

    // Hook should not have been called
    expect(handler).not.toHaveBeenCalled();
    // Original context returned
    expect(result.data.title).toBe('Test');
  });
});
