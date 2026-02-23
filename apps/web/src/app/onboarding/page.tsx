import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = (user.publicMetadata as { role?: string })?.role;

  if (!role) redirect('/onboarding');
  if (role === 'ADMIN') redirect('/admin');
  if (role === 'ANALYST') redirect('/analyst/dashboard');
  if (role === 'ENFORCEMENT') redirect('/enforcement/dashboard');
  redirect('/onboarding');
}