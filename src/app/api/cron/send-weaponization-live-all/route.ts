import { NextResponse } from 'next/server';
import { sendEmail } from '../../../../lib/email';
import { getSupabaseAdminClient } from '../../../../lib/supabase';

/**
 * Broadcasts the "The Weaponization of Human Rights" announcement to all
 * newsletter subscribers via Nodemailer.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { success: false, message: 'GMAIL_APP_PASSWORD not configured.' },
      { status: 500 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { success: false, message: 'Could not create Supabase admin client.' },
      { status: 500 }
    );
  }

  try {
    // Fetch all newsletter subscribers
    const { data: subs, error: fetchError } = await adminClient
      .from('newsletter_subscribers')
      .select('email');

    if (fetchError) {
      console.error('Error fetching subscribers:', fetchError);
      return NextResponse.json(
        { success: false, message: fetchError.message },
        { status: 500 }
      );
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No subscribers to notify.',
        sent: 0,
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        await sendEmail({
          to: sub.email,
          subject: '🔬 New Research Article Now Live — National Legal Observatory',
          html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>New Research Article Now Live</title>
            </head>
            <body style="margin: 0; padding: 20px; background-color: #f4f4f5;">
              <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 32px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="text-align: center; margin-bottom: 32px;">
                  <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #6366f1; font-weight: 700; margin: 0;">National Legal Observatory</p>
                  <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0 0;">Independent Legal Research</p>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 28px 0;" />

                <h1 style="font-size: 26px; color: #0f172a; font-weight: 800; line-height: 1.3; margin: 0 0 16px 0;">
                  The Weaponization of Human Rights
                </h1>

                <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 20px 0;">
                  Our latest research article is now live. This paper examines how international human rights frameworks are often co-opted for geopolitical dominance — asking why the machinery of international indignation switches on completely for some victims and barely stirs for others.
                </p>

                <div style="background: #eef2ff; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 0 0 24px 0;">
                  <p style="font-size: 12px; color: #4338ca; margin: 0; font-weight: 600;">
                  Research Article · 25 min read · 9 JULY 2026 6PM IST
                  </p>
                </div>

                <div style="text-align: center; margin: 28px 0;">
                  <a href="https://legal-observatory.vercel.app/publications/research/the-weaponization-of-human-rights"
                     style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">
                    Read the Full Article →
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
          `,
        });
        sentCount++;
      } catch (err: unknown) {
        console.error(`Failed to send to ${sub.email}:`, err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Failed for ${sub.email}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Announcement broadcast complete.`,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    console.error('Broadcast error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', error: message },
      { status: 500 }
    );
  }
}
