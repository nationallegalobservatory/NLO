import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireSession } from '@/lib/cms/session';
import { getSupabaseAdmin, isCmsBackendConfigured } from '@/lib/cms/supabaseAdmin';
import { chatWithFallback, hasAnyProvider } from '@/lib/cms/providers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Map an article type to its public-site URL folder.
 * Must stay in sync with the public site's folder structure
 * (src/app/publications/[category]/[slug]/page.tsx).
 */
function publicUrlForArticleType(type: string, slug: string): string {
  const folder: Record<string, string> = {
    judgment: 'judgments',
    policy: 'policies',
    research: 'research',
    opinion: 'opinions',
  };
  const f = folder[type] || 'research';
  return `${f}/${slug}`;
}

/**
 * POST /api/cms/newsletter
 * body: { subject, intro?, articleSlugs: string[], scheduleFor?: string }
 *
 * If scheduleFor is null, sends immediately. Otherwise creates a queued send_log
 * row that the cron route will pick up.
 */
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { subject, intro, articleSlugs, scheduleFor } = (await req
    .json()
    .catch(() => ({}))) as {
    subject?: string;
    intro?: string;
    articleSlugs?: string[];
    scheduleFor?: string | null;
  };

  if (!subject || !Array.isArray(articleSlugs) || articleSlugs.length === 0) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  }

  if (!isCmsBackendConfigured()) {
    const { getLocalSubscribers, saveLocalCampaign } = await import('@/lib/cms/localStore');
    const { getArticles } = await import('@/lib/markdown');

    const subs = getLocalSubscribers();
    if (subs.length === 0) {
      return NextResponse.json(
        { error: 'NO_SUBSCRIBERS', message: 'No subscribers found in database. Add subscribers first.' },
        { status: 400 },
      );
    }

    const allArts = await getArticles(undefined, true);
    const selectedArts = allArts
      .filter((a) => articleSlugs.includes(a.slug))
      .map((a) => ({
        slug: a.slug,
        title: a.title,
        date: (a.date as unknown) instanceof Date ? (a.date as unknown as Date).toISOString().slice(0, 10) : String(a.date || ''),
        type: a.type,
        abstract: a.abstract || null,
        citation: a.citation || null,
        coverImage: a.coverImage || null,
        content: a.content || '',
      }));

    if (selectedArts.length === 0) {
      return NextResponse.json({ error: 'NO_ARTICLES', message: 'Selected articles not found.' }, { status: 400 });
    }

    const siteOrigin = req.nextUrl.origin;
    const html = renderEmail({ subject, intro, articles: selectedArts, siteOrigin });

    let sentCount = subs.length;
    let failedCount = 0;
    if (process.env.GMAIL_APP_PASSWORD) {
      const { sendEmail } = await import('@/lib/email');
      for (const s of subs) {
        try {
          await sendEmail({ to: s.email, subject, html });
        } catch {
          failedCount++;
        }
      }
    }

    const campaignLog = saveLocalCampaign({
      campaign_subject: subject,
      recipient_count: subs.length,
      sent_count: sentCount,
      failed_count: failedCount,
      status: scheduleFor ? 'scheduled' : 'sent',
      scheduled_for: scheduleFor || null,
      finished_at: scheduleFor ? null : new Date().toISOString(),
      sent_by: session.email,
    });

    return NextResponse.json({
      ok: true,
      sent: sentCount,
      failed: failedCount,
      sendLogId: campaignLog.id,
      scheduled: !!scheduleFor,
    });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'CMS_NOT_CONFIGURED' }, { status: 503 });

  // 1) Pull subscribers + articles
  const [
    { data: subscribers, count: recipientCount },
    { data: articles },
  ] = await Promise.all([
    admin
      .from('newsletter_subscribers')
      .select('email', { count: 'exact' })
      .eq('active', true),
    admin
      .from('articles')
      .select('slug, title, date, type, abstract, citation, coverImage, content')
      .in('slug', articleSlugs),
  ]);

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ error: 'NO_SUBSCRIBERS' }, { status: 400 });
  }
  if (!articles || articles.length === 0) {
    return NextResponse.json({ error: 'NO_ARTICLES' }, { status: 400 });
  }

  // 2) Build the email HTML (use the NLO template style — keep it simple)
  const siteOrigin = req.nextUrl.origin;
  const html = renderEmail({ subject, intro, articles, siteOrigin });

  // 3) Create the send_log entry
  const { data: log, error: logErr } = await admin
    .from('cms_send_log')
    .insert({
      campaign_subject: subject,
      campaign_id: crypto.randomUUID(),
      recipient_count: subscribers.length,
      sent_count: 0,
      failed_count: 0,
      status: scheduleFor ? 'queued' : 'sending',
      scheduled_for: scheduleFor || null,
      started_at: scheduleFor ? null : new Date().toISOString(),
      sent_by: session.email,
    })
    .select('id, campaign_id')
    .single();

  if (logErr || !log) {
    return NextResponse.json({ error: 'DB_ERROR', detail: logErr?.message }, { status: 500 });
  }

  if (scheduleFor) {
    return NextResponse.json({ ok: true, scheduled: true, sendLogId: log.id });
  }

  // 4) Send now via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    await admin
      .from('cms_send_log')
      .update({
        status: 'failed',
        error_message: 'RESEND_API_KEY is not set.',
        finished_at: new Date().toISOString(),
      })
      .eq('id', log.id);
    return NextResponse.json(
      { error: 'NO_RESEND_KEY', message: 'Set RESEND_API_KEY in .env.local to send emails.' },
      { status: 503 },
    );
  }
  const from = process.env.NEWSLETTER_FROM || 'National Legal Observatory <hello@thenlo.org>';
  const resend = new Resend(resendKey);

  // BCC all subscribers (single API call).
  // Resend's per-call recipient limit is 50; we batch.
  const BATCH = 50;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (let i = 0; i < subscribers.length; i += BATCH) {
    const batch = subscribers.slice(i, i + BATCH);
    try {
      const { error } = await resend.emails.send({
        from,
        to: ['hello@thenlo.org'], // required; we BCC everyone
        bcc: batch.map((s) => s.email),
        subject,
        html,
      });
      if (error) throw new Error(error.message);
      sent += batch.length;
    } catch (err) {
      failed += batch.length;
      const msg = (err as Error).message;
      errors.push(msg);
      console.error('[newsletter] batch failed', err);
    }
  }

  await admin
    .from('cms_send_log')
    .update({
      status: failed === 0 ? 'sent' : failed < sent ? 'partial' : 'failed',
      sent_count: sent,
      failed_count: failed,
      error_message: errors.length > 0 ? errors.slice(0, 3).join(' | ') : null,
      finished_at: new Date().toISOString(),
    })
    .eq('id', log.id);

  // Mark attached articles as sent
  await admin
    .from('articles')
    .update({ cms_newsletter_sent: true, cms_newsletter_sent_at: new Date().toISOString() })
    .in('slug', articleSlugs);

  return NextResponse.json({ ok: true, sent, failed, sendLogId: log.id });
}

/**
 * Render the email HTML. Kept as a function (not template) so we can
 * later swap in MJML or a 3rd-party template engine.
 */
function renderEmail({
  subject,
  intro,
  articles,
  siteOrigin,
}: {
  subject: string;
  intro?: string;
  articles: Array<{
    slug: string;
    title: string;
    date: string;
    type: string;
    abstract: string | null;
    citation: string | null;
    coverImage: string | null;
  }>;
  siteOrigin: string;
}): string {
  const articleHtml = articles
    .map((a) => {
      const url = `${siteOrigin}/publications/${publicUrlForArticleType(a.type, a.slug)}`;
      return `
  <tr><td style="padding: 24px 0; border-bottom: 1px solid #e5e5e5;">
    <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #888;">
      ${escapeHtml(a.type)} · ${escapeHtml(a.date)}
    </p>
    <h2 style="margin: 0 0 8px; font-size: 18px; line-height: 1.3;">
      <a href="${url}" style="color: #7a1f2b; text-decoration: none;">
        ${escapeHtml(a.title)}
      </a>
    </h2>
    ${a.abstract ? `<p style="margin: 0 0 8px; color: #444; font-size: 14px; line-height: 1.5;">${escapeHtml(a.abstract)}</p>` : ''}
    ${a.citation ? `<p style="margin: 0; color: #888; font-size: 12px;">${escapeHtml(a.citation)}</p>` : ''}
  </td></tr>`;
    })
    .join('');

  return `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111; background: #fff;">
  <div style="text-align: center; margin-bottom: 24px;">
    <p style="font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; color: #888; margin: 0;">
      National Legal Observatory
    </p>
    <p style="font-size: 11px; letter-spacing: 0.18em; color: #888; margin: 4px 0 0;">
      Independent Legal Research · India
    </p>
  </div>
  <h1 style="font-size: 22px; line-height: 1.3; margin: 0 0 16px;">${escapeHtml(subject)}</h1>
  ${intro ? `<p style="white-space: pre-line; color: #333; line-height: 1.6; margin: 0 0 16px;">${escapeHtml(intro)}</p>` : ''}
  <table style="width: 100%; border-collapse: collapse;">${articleHtml}</table>
  <hr style="margin: 32px 0; border: 0; border-top: 1px solid #e5e5e5;">
  <p style="font-size: 11px; color: #888; text-align: center; line-height: 1.6;">
    You are receiving this because you subscribed at ${siteOrigin}.<br>
    <a href="${siteOrigin}/privacy" style="color: #888;">Privacy</a> · <a href="${siteOrigin}/terms" style="color: #888;">Terms</a>
  </p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
