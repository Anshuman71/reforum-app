import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { hasRolePermission } from "@/server/lib/permissions";
import { eq } from "drizzle-orm";
import { Suspense } from "react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const canReadSettings = await hasRolePermission(dbUser?.role, "settings", "read");
  const canReadModeration = await hasRolePermission(dbUser?.role, "moderation", "read");

  if (!canReadSettings && !canReadModeration) {
    redirect("/");
  }

  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
