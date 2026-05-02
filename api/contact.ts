import { corsHeaders, preflight } from './_lib/cors';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: Request) {
  try {
    const { name, email, message, subject } = await request.json();

    if (
      !name ||
      typeof name !== 'string' ||
      !email ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      !message ||
      typeof message !== 'string'
    ) {
      return Response.json(
        { error: 'Name, valid email, and message required' },
        { status: 400, headers: corsHeaders(request) },
      );
    }

    const cleanSubject =
      (subject && typeof subject === 'string' && String(subject).slice(0, 120)) ||
      'New contact inquiry';
    const safeName = String(name).slice(0, 120);
    const safeMessage = String(message).slice(0, 5000);

    const htmlBody = [
      `<p><strong>From:</strong> ${escapeHtml(safeName)} &lt;${escapeHtml(email)}&gt;</p>`,
      `<p><strong>Subject:</strong> ${escapeHtml(cleanSubject)}</p>`,
      `<hr/>`,
      `<p>${escapeHtml(safeMessage).replace(/\n/g, '<br/>')}</p>`,
    ].join('');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [process.env.RESEND_REPLY_TO_EMAIL],
        reply_to: email,
        subject: `[Everlastings contact] ${cleanSubject}`,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      console.error('Contact send failed:', await res.text());
      return Response.json(
        { error: 'Failed to send' },
        { status: 500, headers: corsHeaders(request) },
      );
    }

    return Response.json(
      { message: 'Sent' },
      { headers: corsHeaders(request) },
    );
  } catch (err) {
    console.error('Contact error:', err);
    return Response.json(
      { error: 'Failed to send' },
      { status: 500, headers: corsHeaders(request) },
    );
  }
}

export async function OPTIONS(request: Request) {
  return preflight(request)!;
}
