export const dynamic = 'force-dynamic';
import type { Metadata }  from 'next';
import { Inter }          from 'next/font/google';
import { ClerkProvider }  from '@clerk/nextjs';
import { Toaster }        from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title:       'ReUse360 Plus — Water Conservation Platform',
  description: 'AMI-driven irrigation enforcement and reclaimed water management for Pinellas County Utilities',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased bg-slate-50`}>
          {children}
          <Toaster position="bottom-right" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
