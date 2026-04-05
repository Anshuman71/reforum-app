import './globals.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { Navbar } from '@/components/common/Navbar';
import Providers from './client-utils/providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Glossary Community',
  description: 'Generated using Reforum.dev',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        <Providers>
          <main className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">{children}</div>
          </main>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
