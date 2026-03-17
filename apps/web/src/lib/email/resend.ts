import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.error('[email] RESEND_API_KEY is not set');
} else {
  console.log(`[email] RESEND_API_KEY loaded (${resendApiKey.slice(0, 6)}...${resendApiKey.slice(-4)})`);
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS = 'ReUse360 Plus <onboarding@resend.dev>';

interface SendEmailParams {
  to: string;
  cc?: string;
  subject: string;
  html: string;
}

export interface SendResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
}

/**
 * Send an email via Resend. If RESEND_API_KEY is not set (dev mode),
 * logs the email and returns a mock success.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  console.log(`[email] sendEmail called — to=${params.to} subject="${params.subject}"`);
  console.log(`[email] RESEND_API_KEY present: ${!!process.env.RESEND_API_KEY}`);
  console.log(`[email] Resend client initialized: ${!!resend}`);

  if (!resend) {
    console.log(`[email] DEV MODE — would send to ${params.to}: "${params.subject}"`);
    return { success: true, messageId: `dev-${Date.now()}`, error: null };
  }

  try {
    console.log(`[email] Calling resend.emails.send() — from=${FROM_ADDRESS} to=${params.to} cc=${params.cc ?? 'none'}`);
    const sendPayload: { from: string; to: string; cc?: string; subject: string; html: string } = {
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    };
    if (params.cc) sendPayload.cc = params.cc;
    const { data, error } = await resend.emails.send(sendPayload);

    console.log(`[email] Resend response — data:`, JSON.stringify(data));
    console.log(`[email] Resend response — error:`, JSON.stringify(error));

    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, messageId: null, error: error.message };
    }

    console.log(`[email] Email sent successfully — messageId=${data?.id}`);
    return { success: true, messageId: data?.id ?? null, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown send error';
    console.error('[email] Send exception:', msg);
    if (err instanceof Error && err.stack) {
      console.error('[email] Stack:', err.stack);
    }
    return { success: false, messageId: null, error: msg };
  }
}

/**
 * Mask an email address for audit logging: j***@email.com
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  return `${local[0]}***@${domain}`;
}
