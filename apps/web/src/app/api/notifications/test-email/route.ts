import { resend } from '@/lib/email/resend';

/**
 * Shared handler — sends a test email and returns JSON result.
 */
async function handleTestEmail() {
  const to = 'frankrobersonl@gmail.com';
  const timestamp = new Date().toISOString();

  console.log(`[test-email] Resend client initialized: ${resend ? 'YES' : 'NO (API key missing)'}`);
  console.log(`[test-email] RESEND_API_KEY present: ${process.env.RESEND_API_KEY ? `YES (${process.env.RESEND_API_KEY.slice(0, 6)}...${process.env.RESEND_API_KEY.slice(-4)})` : 'NO'}`);

  if (!resend) {
    return Response.json({
      success: false,
      error: 'RESEND_API_KEY not set — Resend client is null',
      hint: 'Add RESEND_API_KEY=re_xxxxx to apps/web/.env.local',
    });
  }

  try {
    console.log(`[test-email] Sending to ${to}...`);

    const { data, error } = await resend.emails.send({
      from: 'ReUse360 Plus <onboarding@resend.dev>',
      to,
      subject: `ReUse360 Email Test — ${timestamp}`,
      html: `<div style="font-family:system-ui,sans-serif;padding:20px;">
        <h2>ReUse360 Email Test</h2>
        <p>If you receive this, Resend is configured correctly.</p>
        <p style="color:#666;font-size:12px;">Sent at: ${timestamp}</p>
      </div>`,
    });

    console.log(`[test-email] Resend raw response — data:`, JSON.stringify(data));
    console.log(`[test-email] Resend raw error:`, JSON.stringify(error));

    if (error) {
      return Response.json({
        success: false,
        error,
        timestamp,
      });
    }

    return Response.json({
      success: true,
      messageId: data?.id ?? null,
      to,
      timestamp,
      data,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[test-email] Exception:`, msg, stack);

    return Response.json({
      success: false,
      error: msg,
      stack,
      timestamp,
    });
  }
}

/** GET /api/notifications/test-email — hit from browser URL bar */
export async function GET() {
  return handleTestEmail();
}

/** POST /api/notifications/test-email — hit from app/fetch */
export async function POST() {
  return handleTestEmail();
}
