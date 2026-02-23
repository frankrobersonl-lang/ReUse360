import { db } from '@/lib/db';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    return Response.json({ status: 'error', db: 'disconnected' }, { status: 503 });
  }
}
