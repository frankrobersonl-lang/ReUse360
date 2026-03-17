import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('[email] RESEND_API_KEY not set — emails will be logged but not delivered');
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS = 'ReUse360 Plus <onboarding@resend.dev>';

interface SendEmailParams {
  to: string;
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
  if (!resend) {
    console.log(`[email] DEV MODE — would send to ${params.to}: "${params.subject}"`);
    return { success: true, messageId: `dev-${Date.now()}`, error: null };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, messageId: null, error: error.message };
    }

    return { success: true, messageId: data?.id ?? null, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown send error';
    console.error('[email] Send failed:', msg);
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
