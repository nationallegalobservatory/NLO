import { NextResponse } from 'next/server';
import { sendEmail } from '../../../lib/email';

export async function POST(request: Request) {
  try {
    if (!process.env.GMAIL_APP_PASSWORD) {
      console.warn('GMAIL_APP_PASSWORD environment variable is not configured.');
      return NextResponse.json(
        { success: false, message: 'Email service is not configured. Please set the GMAIL_APP_PASSWORD env variable.' },
        { status: 500 }
      );
    }

    const { name, email, subject, message } = await request.json().catch(() => ({}));

    if (!name || !email || !message || typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (name, email, message).' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address format.' },
        { status: 400 }
      );
    }

    if (name.length > 100 || message.length > 5000) {
      return NextResponse.json(
        { success: false, message: 'Input exceeds maximum allowed length.' },
        { status: 400 }
      );
    }

    // Strip carriage returns and line feeds from headers to eliminate email header injection
    const cleanSubject = String(subject || 'General Inquiry').replace(/[\r\n]+/g, ' ').slice(0, 100);
    const cleanName = name.replace(/[\r\n]+/g, ' ').slice(0, 100);

    // Send email via Nodemailer
    const result = await sendEmail({
      to: 'nationallegalobservatory@gmail.com',
      replyTo: email.trim(),
      subject: `NLO Query: ${cleanSubject.toUpperCase()} - ${cleanName}`,
      html: `
        <h3>New Inquiry from National Legal Observatory Portal</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject Classification:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
          ${message}
        </div>
      `,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Inquiry sent successfully.' });
  } catch (error: any) {
    console.error('Contact API error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error.' }, { status: 500 });
  }
}

