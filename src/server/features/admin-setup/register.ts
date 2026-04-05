import { onAfterEvent } from '@/server/lib/events';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export function registerAdminSetup() {
  onAfterEvent('user:afterSignup', async (ctx) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && ctx.user.email === adminEmail) {
      await db
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, ctx.user.id));
    }
  });
}
