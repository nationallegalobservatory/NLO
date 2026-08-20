import { NextResponse } from 'next/server';
import { sendEmail } from '../../../../lib/email';

export async function GET(request: Request) {
  // Allow manual trigger for testing without CRON_SECRET for now, or just require it if in production
  
  const testEmail = 'utkarshisbest69@gmail.com';
  
  if (!process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { success: false, message: 'GMAIL_APP_PASSWORD not configured on server.' },
      { status: 500 }
    );
  }

  try {
    const result = await sendEmail({
      to: testEmail,
      subject: 'Preview: 🔬 Custody, Consent, and the Limits of Law (Tukaram Review)',
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #fafafa; padding: 40px 32px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 32px;">
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #6366f1; font-weight: 700; margin: 0;">National Legal Observatory</p>
            <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0 0;">Independent Legal Research</p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 28px 0;" />

          <h1 style="font-size: 26px; color: #0f172a; font-weight: 800; line-height: 1.3; margin: 0 0 16px 0;">
            Custody, Consent, and the Limits of Law: Revisiting Tukaram v. State of Maharashtra
          </h1>

          <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 20px 0;">
            Some judgments fail quietly. Tukaram v. State of Maharashtra did not. Our latest Judgment Review revisits the Mathura rape case, exploring the intersection of caste, class, and institutional power, and how the Supreme Court's visible failure led to historic criminal law reforms.
          </p>

          <div style="background: #eef2ff; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 0 0 24px 0;">
            <p style="font-size: 12px; color: #4338ca; margin: 0; font-weight: 600;">
              Judgment Review · August 2026
            </p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="https://legal-observatory.vercel.app/publications/research/tukaram-v-maharashtra-nlo-judgment-review"
               style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">
              Read the Full Review →
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;" />

          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.6;">
            TEST TRAILER EMAIL<br />
            <a href="https://legal-observatory.vercel.app" style="color: #6366f1; text-decoration: none;">legal-observatory.vercel.app</a>
          </p>
        </div>
      `,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: \`Test trailer sent to \${testEmail} successfully!\`,
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
