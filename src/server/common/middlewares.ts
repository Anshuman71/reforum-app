import { auth } from '@/server/lib/auth';
import { createMiddleware } from 'hono/factory';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { AuthedVariables } from '@/types';

export const authMiddleware = createMiddleware<{ Variables: AuthedVariables }>(
  async (c, next) => {
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!sessionData) {
      c.set('user', null);
      c.set('session', null);
      return next();
    }

    // Get user role directly from users table (single-tenant, no org layer)
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, sessionData.user.id))
      .limit(1);

    const role = (dbUser?.role ?? 'user') as 'user' | 'moderator' | 'admin';

    c.set('user', {
      ...sessionData.user,
      role,
    });
    c.set('session', sessionData.session);
    return next();
  }
);
