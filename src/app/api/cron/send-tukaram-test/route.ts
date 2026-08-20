import { NextResponse } from 'next/server';
import { sendEmail } from '../../../../lib/email';

/**
 * Sends a test version of the "Tukaram v. State of Maharashtra" announcement.
 * Usage: /api/cron/send-tukaram-test?email=tester@example.com
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testerEmail = searchParams.get('email');

  // We don't enforce CRON_SECRET here so you can easily test from the browser.
  // In production, you might still want to protect it.

  if (!testerEmail) {
    return NextResponse.json({ error: 'Please provide an email parameter, e.g., ?email=tester@example.com' }, { status: 400 });
  }

  if (!process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { success: false, message: 'GMAIL_APP_PASSWORD not configured. Please set it in your environment variables.' },
      { status: 500 }
    );
  }

  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Judgment Review Now Live</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f4f4f5;">
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 32px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="text-align: center; margin-bottom: 32px;">
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #6366f1; font-weight: 700; margin: 0;">National Legal Observatory</p>
            <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0 0;">Independent Legal Research</p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 28px 0;" />

          <h1 style="font-size: 26px; color: #0f172a; font-weight: 800; line-height: 1.3; margin: 0 0 16px 0;">
            Custody, Consent, and the Limits of Law: Revisiting Tukaram v. State of Maharashtra (TEST)
          </h1>

          <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 20px 0;">
            Our latest judgment review is now live. This analysis revisits the landmark Tukaram v. State of Maharashtra case, examining its profound implications on consent, custodial violence, and the burden of proof in the Indian legal system.
          </p>

          <div style="background: #eef2ff; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 0 0 24px 0;">
            <p style="font-size: 12px; color: #4338ca; margin: 0; font-weight: 600;">
              Judgment Review · 20 Aug 2026
            </p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="https://legal-observatory.vercel.app/publications/research/tukaram-v-maharashtra-nlo-judgment-review"
               style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">
              Read the Full Review →
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;" />

          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0 0 12px 0; line-height: 1.6;">
            You received this email because you subscribed to the National Legal Observatory newsletter.<br />
            <a href="https://legal-observatory.vercel.app" style="color: #6366f1; text-decoration: none;">legal-observatory.vercel.app</a>
          </p>
          
          <div style="text-align: center;">
            <a href="mailto:nationallegalobservatory@gmail.com?subject=Unsubscribe%20me%20from%20NLO&body=Please%20unsubscribe%20me%20from%20NLO" style="font-size: 11px; color: #94a3b8; text-decoration: underline;">
              Unsubscribe
            </a>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({
      to: testerEmail,
      subject: '⚖️ [TEST] New Judgment Review Now Live — National Legal Observatory',
      html: htmlContent,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: \`Test email successfully sent to \${testerEmail}\`,
      });
    } else {
      throw new Error(result.error);
    }
  } catch (err: unknown) {
    console.error('Failed to send test email:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', error: message },
      { status: 500 }
    );
  }
}
