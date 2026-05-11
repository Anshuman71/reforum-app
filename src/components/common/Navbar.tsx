'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { client } from '@/app/client-utils/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRef, useState } from 'react';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

async function uploadAvatarFile(file: File) {
  const prepareResponse = await client.uploads.avatar.prepare.$post({
    json: {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    },
  });

  const preparePayload = await prepareResponse.json();

  if (!prepareResponse.ok) {
    throw new Error(
      (preparePayload as any)?.error?.message ?? 'Failed to prepare avatar upload'
    );
  }

  const target = preparePayload as {
    strategy: 'presigned' | 'server';
    uploadUrl: string;
    method: 'PUT' | 'POST';
    headers?: Record<string, string>;
    storagePath: string;
  };

  if (target.strategy === 'presigned') {
    const uploadResponse = await fetch(target.uploadUrl, {
      method: target.method,
      body: file,
      headers: target.headers,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload avatar to storage');
    }
  } else {
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch(target.uploadUrl, {
      method: target.method,
      body: formData,
    });

    if (!uploadResponse.ok) {
      const payload = await uploadResponse.json().catch(() => null);
      throw new Error(
        payload?.error?.message ?? 'Failed to upload avatar to local storage'
      );
    }
  }

  const completeResponse = await client.uploads.avatar.complete.$post({
    json: {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath: target.storagePath,
    },
  });

  const completePayload = await completeResponse.json();

  if (!completeResponse.ok) {
    throw new Error(
      (completePayload as any)?.error?.message ?? 'Failed to finalize avatar upload'
    );
  }
}

export function Navbar() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Handle search functionality - you can implement this based on your needs
      console.log('Searching for:', searchQuery);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleAvatarSelection = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      alert('Avatar size must be 5MB or less.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      await uploadAvatarFile(file);
      router.refresh();
      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to upload avatar. Please try again.'
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Community Logo/Title */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                C
              </div>
              <span className="font-semibold text-lg">Community</span>
            </Link>
          </div>

          {/* Right side - Search bar and User actions */}
          <div className="flex items-center space-x-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarSelection}
            />
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-64 pl-10"
              />
            </form>

            {/* User Authentication */}
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={session.user.image || undefined}
                        alt={session.user.name || 'User'}
                      />
                      <AvatarFallback>
                        {getUserInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem className="flex flex-col items-start">
                    <div className="font-medium">{session.user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {session.user.email}
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? 'Uploading avatar...' : 'Update avatar'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button asChild>
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
