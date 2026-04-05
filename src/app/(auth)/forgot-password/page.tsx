'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      // TODO: Requires email plugin to be configured
      await (authClient as any).forgetPassword({
        email,
        redirectTo: '/reset-password',
      });
      setSent(true);
      toast.success('Password reset email sent!');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send reset email';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Check your email</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            We&apos;ve sent a password reset link to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <p className="text-sm text-gray-600">
              If you don&apos;t see the email, check your spam folder or try
              again.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
            >
              Try different email
            </Button>
            <Link href="/sign-in" className="text-center text-sm underline">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Forgot Password</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Enter your email address and we&apos;ll send you a link to reset your
          password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              onChange={e => {
                setEmail(e.target.value);
              }}
              value={email}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            onClick={handleForgotPassword}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Send reset link'
            )}
          </Button>

          <Link href="/sign-in" className="text-center text-sm underline">
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
