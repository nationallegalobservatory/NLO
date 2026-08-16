/**
 * NLO Newsletter Sender
 * Usage: node scripts/send-newsletter.js [--testers-only] [--email-number 1|2|3]
 *
 * Defaults to sending all 3 emails to testers only.
 * Pass --all-subscribers to send to real subscriber list.
 */

const nodemailer = require('nodemailer');

// Load .env.local manually (no dotenv dependency needed)
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

// ─── Config ────────────────────────────────────────────────────────────────────

const FROM = '"National Legal Observatory" <nationallegalobservatory@gmail.com>';
const NLO_INBOX = 'nationallegalobservatory@gmail.com';

const TESTERS = [
  'utkarshisbest69@gmail.com',
  'bhoomija.k2810@gmail.com',
];

const SUBSCRIBERS = [
  'lakshaywork5577@gmail.com',
  'batrasaksham007@gmail.com',
  'utkarshisbest69@gmail.com',
  'alexallenwheeler@gmail.com',
  'kbhoomija04@gmail.com',
  'jhilmili.k06@gmail.com',
  'bhoomija.k2810@gmail.com',
  'akaanshasirohia@gmail.com',
  'aksohi12@gmail.com',
];

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: NLO_INBOX,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ─── Shared styles ─────────────────────────────────────────────────────────────

const GOLD = '#D3AC2B';
const DARK = '#1a1a1a';
const LIGHT_BG = '#f8f6f1';
const CARD_BG = '#ffffff';
const MUTED = '#6b6b6b';
const BORDER = '#e5e0d8';

const wrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>National Legal Observatory</title>
</head>
<body style="margin:0;padding:0;background:${LIGHT_BG};font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT_BG};padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${CARD_BG};border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">

        <!-- Header bar -->
        <tr>
          <td style="background:${DARK};padding:22px 36px;text-align:center;">
            <span style="display:inline-block;background:${DARK};border:1px solid rgba(211,172,43,0.4);border-radius:6px;padding:6px 14px;font-family:'Georgia',serif;font-size:13px;font-weight:900;letter-spacing:3px;color:${GOLD};">NLO</span>
            <p style="margin:8px 0 0 0;font-family:sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.45);">National Legal Observatory &nbsp;·&nbsp; Independent Legal Research</p>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:40px 36px 32px 36px;">${content}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0ece4;border-top:1px solid ${BORDER};padding:24px 36px;text-align:center;">
            <p style="margin:0 0 6px 0;font-family:sans-serif;font-size:11px;color:${MUTED};">
              You're receiving this because you subscribed to NLO updates.
            </p>
            <p style="margin:0;font-family:sans-serif;font-size:11px;color:${MUTED};">
              <a href="https://legal-observatory.vercel.app" style="color:${GOLD};text-decoration:none;">legal-observatory.vercel.app</a>
              &nbsp;·&nbsp;
              <a href="mailto:nationallegalobservatory@gmail.com" style="color:${MUTED};text-decoration:none;">nationallegalobservatory@gmail.com</a>
            </p>
            <p style="margin:10px 0 0 0;font-family:sans-serif;font-size:10px;color:#aaa;letter-spacing:1px;text-transform:uppercase;">
              [TESTING VERSION — Not for public distribution]
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ─── Email 1: Something is Cooking ─────────────────────────────────────────────

const email1 = {
  subject: '[TESTING] Something is coming from the National Legal Observatory',
  html: wrapper(`
    <p style="margin:0 0 4px 0;font-family:sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-weight:700;">
      A Note from the Observatory
    </p>

    <h1 style="margin:12px 0 20px 0;font-family:'Georgia',serif;font-size:28px;font-weight:900;color:${DARK};line-height:1.25;">
      Something is in the works.
    </h1>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      Dear Reader,
    </p>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      Since the National Legal Observatory went live in June 2026, we've been quietly at work — reading court records, tracking legislative shifts, and building the kind of structured legal analysis India doesn't have enough of.
    </p>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      We're writing to let you know that something significant is on its way. New research is being prepared. New perspectives are being drafted. The Observatory is growing — and you'll be the first to know when it arrives.
    </p>

    <!-- Pull quote -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr>
        <td style="border-left:3px solid ${GOLD};padding:12px 20px;background:#fdf9ee;">
          <p style="margin:0;font-family:'Georgia',serif;font-size:14px;font-style:italic;color:#3a3a3a;line-height:1.7;">
            "What is scarce is not information. What is scarce is sustained, independent, structured analysis of that information, produced without an agenda and accessible without a paywall."
          </p>
          <p style="margin:10px 0 0 0;font-family:sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">
            — Bhoomija Khanna, Founding Note · NLO
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      That mission hasn't changed. Stay tuned — and thank you for being here from the beginning.
    </p>

    <p style="margin:0 0 32px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      Warm regards,<br />
      <strong>Bhoomija Khanna</strong><br />
      <span style="font-size:13px;color:${MUTED};">Founder & Research Director, National Legal Observatory</span>
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="https://legal-observatory.vercel.app/publications"
             style="display:inline-block;background:${DARK};color:${GOLD};padding:13px 28px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;">
            Browse Current Publications →
          </a>
        </td>
      </tr>
    </table>
  `),
};

// ─── Email 2: Vol. 1 Issue 1 is Live ───────────────────────────────────────────

const email2 = {
  subject: '[TESTING] NLO Vol. 1, Issue 1 — June 2026 is now published',
  html: wrapper(`
    <p style="margin:0 0 4px 0;font-family:sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-weight:700;">
      New Publication
    </p>

    <h1 style="margin:12px 0 6px 0;font-family:'Georgia',serif;font-size:26px;font-weight:900;color:${DARK};line-height:1.25;">
      Vol. 1, Issue 1 — June 2026
    </h1>
    <p style="margin:0 0 24px 0;font-family:sans-serif;font-size:11px;color:${MUTED};letter-spacing:1px;text-transform:uppercase;">
      The Monthly Legal Review is now live
    </p>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      Dear Reader,
    </p>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      The first issue of the <strong>NLO Monthly Legal Review</strong> has been published. This is the beginning of what we intend to be a consistent, rigorous record of India's legal landscape — delivered every month, built from primary sources.
    </p>

    <!-- Issue card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid ${BORDER};border-radius:6px;overflow:hidden;">
      <tr>
        <td style="background:#fdf9ee;padding:20px 24px;border-bottom:1px solid ${BORDER};">
          <p style="margin:0 0 4px 0;font-family:sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-weight:700;">This Issue Covers</p>
          <p style="margin:0;font-family:'Georgia',serif;font-size:17px;font-weight:800;color:${DARK};">NLO Monthly Legal Review — June 2026</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 24px;">
          <ul style="margin:0;padding-left:18px;font-family:'Georgia',serif;font-size:14px;color:#2a2a2a;line-height:2;">
            <li>Constitutional developments — Supreme Court of India</li>
            <li>Legislative updates from Parliament</li>
            <li>Notable judgments — High Courts</li>
            <li>Technology &amp; surveillance law developments</li>
            <li>Editorial commentary — The Observatory Directive</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      The full issue is available to read on the platform, and the academic draft is available for download in DOCX format.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr>
        <td align="center" style="padding-right:8px;">
          <a href="https://legal-observatory.vercel.app/publications"
             style="display:inline-block;background:${DARK};color:${GOLD};padding:13px 24px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;">
            Read Online →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 0 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      Thank you for being a part of this from Issue One.
    </p>

    <p style="margin:16px 0 0 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      <strong>Bhoomija Khanna</strong><br />
      <span style="font-size:13px;color:${MUTED};">Founder & Research Director, National Legal Observatory</span>
    </p>
  `),
};

// ─── Email 3: Invitation to Contribute / Submit Research ───────────────────────

const email3 = {
  subject: '[TESTING] NLO is now open for research submissions',
  html: wrapper(`
    <p style="margin:0 0 4px 0;font-family:sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-weight:700;">
      Open Call
    </p>

    <h1 style="margin:12px 0 20px 0;font-family:'Georgia',serif;font-size:27px;font-weight:900;color:${DARK};line-height:1.25;">
      The Observatory is open for submissions.
    </h1>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      Dear Reader,
    </p>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      The National Legal Observatory was founded on one principle: that rigorous, independent legal analysis should be accessible — not locked behind institutions, firms, or paywalls.
    </p>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      That principle extends to who gets to contribute. Whether you're a law student, a practitioner, an academic, or an independent researcher — if your work is primary-source driven and holds itself to a standard, we want to hear from you.
    </p>

    <!-- What we publish -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#fdf9ee;border:1px solid #ecdfc0;border-radius:6px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px 0;font-family:sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-weight:700;">We Publish</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="vertical-align:top;padding-right:12px;">
                <ul style="margin:0;padding-left:16px;font-family:'Georgia',serif;font-size:13px;color:#2a2a2a;line-height:2;">
                  <li>Case law analysis &amp; judgment reviews</li>
                  <li>Legislative commentary</li>
                  <li>Constitutional law research</li>
                </ul>
              </td>
              <td width="50%" style="vertical-align:top;">
                <ul style="margin:0;padding-left:16px;font-family:'Georgia',serif;font-size:13px;color:#2a2a2a;line-height:2;">
                  <li>Policy analysis &amp; opinion</li>
                  <li>Technology &amp; surveillance law</li>
                  <li>Human rights &amp; civil liberties</li>
                </ul>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 18px 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      Submissions go through editorial review. We uphold OSCOLA citation standards and expect arguments built from statute, case law, and first principles — not from commentary alone.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr>
        <td align="center">
          <a href="https://legal-observatory.vercel.app/contact"
             style="display:inline-block;background:${DARK};color:${GOLD};padding:13px 28px;border-radius:6px;text-decoration:none;font-family:sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;">
            Submit Your Research →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 0 0;font-family:'Georgia',serif;font-size:14px;color:${MUTED};line-height:1.7;border-top:1px solid ${BORDER};padding-top:20px;">
      Questions? Reply to this email or write to us at
      <a href="mailto:nationallegalobservatory@gmail.com" style="color:${GOLD};text-decoration:none;">nationallegalobservatory@gmail.com</a>
    </p>

    <p style="margin:20px 0 0 0;font-family:'Georgia',serif;font-size:15px;color:#2a2a2a;line-height:1.75;">
      <strong>Bhoomija Khanna</strong><br />
      <span style="font-size:13px;color:${MUTED};">Founder & Research Director, National Legal Observatory</span>
    </p>
  `),
};

// ─── Gmail Draft via IMAP APPEND ───────────────────────────────────────────────
// Nodemailer doesn't support drafts natively; we use the smtp2 approach of
// sending to the NLO inbox itself with a special flag.
// Since Gmail's IMAP "append to Drafts" needs imap lib, we send to testers
// directly and save a local HTML copy so you can paste into Gmail Drafts.

const EMAILS = [email1, email2, email3];

async function saveDraftsLocally() {
  const dir = path.join(__dirname, '..', 'email-drafts');
  fs.mkdirSync(dir, { recursive: true });
  EMAILS.forEach((email, i) => {
    const filename = path.join(dir, `email-${i + 1}-draft.html`);
    fs.writeFileSync(filename, email.html, 'utf8');
    console.log(`  📄 Draft saved: email-drafts/email-${i + 1}-draft.html`);
  });
}

async function sendToTesters() {
  console.log('\n📨 Sending all 3 emails to testers...\n');
  for (const [i, email] of EMAILS.entries()) {
    for (const tester of TESTERS) {
      try {
        await transporter.sendMail({ from: FROM, to: tester, subject: email.subject, html: email.html });
        console.log(`  ✅ Email ${i + 1} → ${tester}`);
      } catch (err) {
        console.error(`  ❌ Email ${i + 1} → ${tester} FAILED:`, err.message);
      }
    }
  }
}

async function sendToSubscribers() {
  console.log('\n📨 Sending all 3 emails to subscribers...\n');
  for (const [i, email] of EMAILS.entries()) {
    for (const sub of SUBSCRIBERS) {
      try {
        await transporter.sendMail({ from: FROM, to: sub, subject: email.subject, html: email.html });
        console.log(`  ✅ Email ${i + 1} → ${sub}`);
      } catch (err) {
        console.error(`  ❌ Email ${i + 1} → ${sub} FAILED:`, err.message);
      }
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const args = process.argv.slice(2);
  const sendToAll = args.includes('--all-subscribers');

  console.log('══════════════════════════════════════════');
  console.log('  NLO Newsletter Sender');
  console.log('══════════════════════════════════════════');
  console.log(`  Mode: ${sendToAll ? 'ALL SUBSCRIBERS' : 'TESTERS ONLY'}`);
  console.log(`  Emails: ${EMAILS.length}`);
  console.log(`  Recipients: ${sendToAll ? SUBSCRIBERS.join(', ') : TESTERS.join(', ')}`);
  console.log('══════════════════════════════════════════\n');

  // Always save local HTML drafts
  console.log('💾 Saving HTML drafts locally...');
  await saveDraftsLocally();

  if (sendToAll) {
    await sendToSubscribers();
  } else {
    await sendToTesters();
  }

  console.log('\n✅ Done.');
  console.log('\n💡 To add these to Gmail Drafts manually:');
  console.log('   Open email-drafts/email-N-draft.html in browser → Copy All → Paste into Gmail compose.');
})();
