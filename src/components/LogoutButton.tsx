'use client';

import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LogoutButtonProps {
  children?: React.ReactNode;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
}

export function LogoutButton({
  children,
  variant = 'outline',
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success('Signed out successfully');
            router.push('/sign-in');
          },
          onError: ctx => {
            toast.error(ctx.error.message || 'Failed to sign out');
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} onClick={handleLogout} disabled={loading}>
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        children || 'Sign Out'
      )}
    </Button>
  );
}
