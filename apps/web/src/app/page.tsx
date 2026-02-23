import { auth }          from '@clerk/nextjs/server';
import { redirect }      from 'next/navigation';
import { getDefaultRoute } from '@reuse360/auth';

export default async function RootPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) redirect('/sign-in');

  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!role) redirect('/onboarding');

  redirect(getDefaultRoute(role as any));
}
