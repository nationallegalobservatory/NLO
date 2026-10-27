import { NextResponse } from 'next/server';
import { sendEmail } from '../../../../lib/email';
import { getSupabaseClient, isSupabaseConfigured } from '../../../../lib/supabase';

/**
 * Vercel Cron Job — runs at 7:00 PM IST (13:30 UTC) on June 19, 2026.
 * Fetches all unsent article reminders from Supabase, sends each a
 * notification email via Nodemailer, and marks them as sent.
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

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, message: 'Supabase not configured.' },
      { status: 500 }
    );
  }

  const supabase = getSupabaseClient() as any;
  if (!supabase) {
    return NextResponse.json(
      { success: false, message: 'Could not create Supabase client.' },
      { status: 500 }
    );
  }

  try {
    // Fetch all unsent reminders
    const { data: reminders, error: fetchError } = await supabase
      .from('article_reminders')
      .select('id, email, article_slug')
      .eq('sent', false);

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError);
      return NextResponse.json(
        { success: false, message: fetchError.message },
        { status: 500 }
      );
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending reminders to send.',
        sent: 0,
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const reminder of reminders) {
      try {
        const result = await sendEmail({
          to: reminder.email,
          subject: '🔬 New Research Article Now Live — National Legal Observatory',
          html: `
            <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #fafafa; padding: 40px 32px; border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #6366f1; font-weight: 700; margin: 0;">National Legal Observatory</p>
                <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0 0;">Independent Legal Research</p>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 28px 0;" />

              <h1 style="font-size: 26px; color: #0f172a; font-weight: 800; line-height: 1.3; margin: 0 0 16px 0;">
                Manufacturing Consent: How Political Narratives Are Engineered in India
              </h1>

              <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 20px 0;">
                Our latest research article is now live. This paper examines the mechanisms through which political consent is manufactured in India — from historical propaganda techniques to modern algorithmic amplification — and proposes a framework for building democratic resilience.
              </p>

              <div style="background: #eef2ff; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 0 0 24px 0;">
                <p style="font-size: 12px; color: #4338ca; margin: 0; font-weight: 600;">
                  Research Article · 22 min read · June 2026
                </p>
              </div>

              <div style="text-align: center; margin: 28px 0;">
                <a href="https://legal-observatory.vercel.app/publications/research/manufacturing-consent"
                   style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">
                  Read the Full Article →
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;" />

              <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.6;">
                You received this email because you set a reminder on the National Legal Observatory.<br />
                <a href="https://legal-observatory.vercel.app" style="color: #6366f1; text-decoration: none;">legal-observatory.vercel.app</a>
              </p>
            </div>
          `,
        });

        if (!result.success) {
          errors.push(`${reminder.email}: ${result.error}`);
          continue;
        }

        // Mark as sent
        await supabase
          .from('article_reminders')
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq('id', reminder.id);

        sentCount++;
      } catch (err: any) {
        errors.push(`${reminder.email}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount}/${reminders.length} reminder emails.`,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Cron send-reminders error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

