'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface GuestRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function GuestRoute({ children, fallback }: GuestRouteProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && session) {
      router.push('/');
    }
  }, [session, isPending, router]);

  if (isPending) {
    return fallback || <div>Loading...</div>;
  }

  if (session) {
    return fallback || null;
  }

  return <>{children}</>;
}
