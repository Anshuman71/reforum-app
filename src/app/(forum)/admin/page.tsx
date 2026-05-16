import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/server/lib/auth';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { hasRolePermission } from '@/server/lib/permissions';

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/sign-in');
  }

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (await hasRolePermission(dbUser?.role, 'settings', 'read')) {
    redirect('/admin/settings');
  }

  if (await hasRolePermission(dbUser?.role, 'moderation', 'read')) {
    redirect('/admin/moderation');
  }

  redirect('/');
}
