'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const settingsNavItems = [
  { id: 'categories', label: 'Categories', href: '/admin/settings/categories' },
  { id: 'users', label: 'Users', href: '/admin/settings/users' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>
      <div className="flex gap-8">
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {settingsNavItems.map(item => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
