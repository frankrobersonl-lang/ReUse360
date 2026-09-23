export const dynamic = 'force-dynamic';
import type { Metadata, Viewport } from 'next';
import { Inter }          from 'next/font/google';
import { ClerkProvider }  from '@clerk/nextjs';
import { Toaster }        from 'sonner';
import ChatWidget         from '@/components/ChatWidget';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title:       'ReUse360 Plus | AMI-Powered Water Conservation Operations',
  description: 'Turn water-use data into conservation action across monitoring, customer engagement, programs, assistance, and optional compliance.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased bg-slate-50`} suppressHydrationWarning={true}>
          {children}
          <Toaster position="bottom-right" richColors />
          <ChatWidget />
        </body>
      </html>
    </ClerkProvider>
  );
}
