import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { newId } from '@/server/lib/id';

export const auth = betterAuth({
  rateLimit: {
    storage: 'database',
    modelName: 'rate_limit',
  },
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),
  advanced: {
    cookiePrefix: 'reforum',
    database: {
      generateId: (options: { model: string; size?: number }) => {
        return newId(options.model as any);
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const adminEmail = process.env.ADMIN_EMAIL;
          if (adminEmail && user.email === adminEmail) {
            await db
              .update(users)
              .set({ role: 'admin' })
              .where(eq(users.id, user.id));
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
