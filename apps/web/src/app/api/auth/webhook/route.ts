import { Webhook }       from 'svix';
import { headers }       from 'next/headers';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { db }            from '@/lib/db';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId        = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const payload = await req.json();
  const body    = JSON.stringify(payload);

  let event: WebhookEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event    = wh.verify(body, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { type, data } = event;

  try {
    if (type === 'user.created') {
      await db.user.upsert({
        where:  { clerkId: data.id },
        create: {
          clerkId:   data.id,
          email:     data.email_addresses[0]?.email_address ?? '',
          firstName: data.first_name ?? null,
          lastName:  data.last_name  ?? null,
          role:      'ENFORCEMENT',
          isActive:  true,
        },
        update: {
          email:     data.email_addresses[0]?.email_address ?? '',
          firstName: data.first_name ?? null,
          lastName:  data.last_name  ?? null,
        },
      });
    }

    if (type === 'user.updated') {
      const role = (data.public_metadata as { role?: string })?.role;
      await db.user.upsert({
        where:  { clerkId: data.id },
        create: {
          clerkId:   data.id,
          email:     data.email_addresses[0]?.email_address ?? '',
          firstName: data.first_name ?? null,
          lastName:  data.last_name  ?? null,
          role:      (role as any) ?? 'ENFORCEMENT',
          isActive:  true,
        },
        update: {
          email:     data.email_addresses[0]?.email_address ?? '',
          firstName: data.first_name ?? null,
          lastName:  data.last_name  ?? null,
          ...(role ? { role: role as any } : {}),
        },
      });
    }

    if (type === 'user.deleted' && data.id) {
      await db.user.updateMany({
        where:  { clerkId: data.id },
        data:   { isActive: false },
      });
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('[Webhook] DB error:', err);
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}
