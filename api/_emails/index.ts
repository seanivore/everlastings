import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

const SIGNATURE = '— Sunkeeper at Everlastings by Emaline';

const CARRIER_URLS: Record<string, (n: string) => string> = {
  USPS: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`,
  FEDEX: (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`,
  DHL: (n) => `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(n)}`,
};

export function trackingUrl(carrier: string, number: string): string | null {
  if (!carrier || !number) return null;
  const builder = CARRIER_URLS[carrier.trim().toUpperCase()];
  return builder ? builder(number) : null;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatExpiryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function shell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Everlastings by Emaline</title>
</head>
<body style="margin:0;padding:0;background:#f6f4ef;font-family:Georgia,'Times New Roman',serif;color:#2a2a2a;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f4ef;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;">
<tr><td style="padding:32px 32px 8px 32px;">
<p style="margin:0;font-size:14px;letter-spacing:0.12em;text-transform:uppercase;color:#7a6f5f;">Everlastings by Emaline</p>
</td></tr>
<tr><td style="padding:8px 32px 32px 32px;font-size:16px;line-height:1.6;color:#2a2a2a;">
${bodyHtml}
</td></tr>
<tr><td style="padding:0 32px 32px 32px;font-size:13px;color:#7a6f5f;border-top:1px solid #ece7dc;padding-top:16px;">
<p style="margin:16px 0 0 0;">Everlastings by Emaline · handcrafted preserved botanicals</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export interface TrackingEmailArgs {
  orderId: string;
  productTitle: string;
  trackingNumber: string;
  trackingCarrier: string;
  trackingUrl: string;
  customerName?: string;
}

export function trackingEmailHtml(args: TrackingEmailArgs): { subject: string; html: string } {
  const greeting = args.customerName ? escapeHtml(args.customerName) : 'Dear collector';
  const productTitle = escapeHtml(args.productTitle);
  const carrier = escapeHtml(args.trackingCarrier);
  const number = escapeHtml(args.trackingNumber);
  const url = args.trackingUrl;
  const orderId = escapeHtml(args.orderId);

  const body = `
<h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;color:#2a2a2a;">Your haven is on its way</h1>
<p style="margin:0 0 16px 0;">${greeting},</p>
<p style="margin:0 0 16px 0;"><strong>${productTitle}</strong> has been carefully packed and handed to ${carrier}.</p>
<p style="margin:0 0 8px 0;">Tracking number: <strong>${number}</strong></p>
<p style="margin:0 0 24px 0;">
  <a href="${url}" style="display:inline-block;padding:12px 20px;background:#2a2a2a;color:#ffffff;text-decoration:none;border-radius:4px;">Track your package</a>
</p>
<p style="margin:0 0 8px 0;font-size:13px;color:#7a6f5f;">Order reference: ${orderId}</p>
<p style="margin:24px 0 0 0;">With care,<br>${SIGNATURE}</p>
`;

  return {
    subject: 'Your haven is on its way',
    html: shell(body),
  };
}

export interface WelcomeCouponEmailArgs {
  promoCode: string;
  expiresAt: string;
}

export function welcomeCouponEmailHtml(args: WelcomeCouponEmailArgs): { subject: string; html: string } {
  const code = escapeHtml(args.promoCode);
  const expiry = escapeHtml(formatExpiryDate(args.expiresAt));

  const body = `
<h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;color:#2a2a2a;">Welcome — your 5% code is inside</h1>
<p style="margin:0 0 16px 0;">Thank you for joining the Everlastings letter. As a small welcome, here is 5% off your first haven.</p>
<p style="margin:0 0 8px 0;">Your code:</p>
<p style="margin:0 0 24px 0;font-size:22px;letter-spacing:0.08em;font-weight:bold;background:#f6f4ef;padding:16px;border-radius:4px;text-align:center;">${code}</p>
<p style="margin:0 0 16px 0;">Apply it at checkout. The code expires on <strong>${expiry}</strong>.</p>
<p style="margin:24px 0 0 0;">With care,<br>${SIGNATURE}</p>
`;

  return {
    subject: 'Welcome — your 5% code is inside',
    html: shell(body),
  };
}

export interface CartRecoveryCouponEmailArgs {
  promoCode: string;
  lostItems: Array<{ slug: string; title: string }>;
  percentOff: number;
  expiresInDays: number;
}

export function cartRecoveryCouponEmailHtml(args: CartRecoveryCouponEmailArgs): { subject: string; html: string } {
  const code = escapeHtml(args.promoCode);
  const percent = args.percentOff;
  const days = args.expiresInDays;
  const itemsHtml = args.lostItems.length
    ? `<ul style="margin:0 0 16px 0;padding-left:20px;">${args.lostItems
        .map((item) => `<li style="margin:0 0 6px 0;">${escapeHtml(item.title || item.slug)}</li>`)
        .join('')}</ul>`
    : '';

  const body = `
<h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;color:#2a2a2a;">A small apology, and ${percent}% off</h1>
<p style="margin:0 0 16px 0;">The piece you were holding sold to another collector before checkout closed. Each haven is one of one, so we cannot remake it — but we would like to soften the loss.</p>
${itemsHtml ? `<p style="margin:0 0 8px 0;">What you were holding:</p>${itemsHtml}` : ''}
<p style="margin:0 0 8px 0;">Please accept ${percent}% off any haven still available:</p>
<p style="margin:0 0 24px 0;font-size:22px;letter-spacing:0.08em;font-weight:bold;background:#f6f4ef;padding:16px;border-radius:4px;text-align:center;">${code}</p>
<p style="margin:0 0 16px 0;">The code is yours alone and expires in ${days} days.</p>
<p style="margin:24px 0 0 0;">With care,<br>${SIGNATURE}</p>
`;

  return {
    subject: `A small apology, and ${percent}% off your next haven`,
    html: shell(body),
  };
}

export interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOpts): Promise<{ id: string | null; error: unknown | null }> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.error('sendEmail: RESEND_FROM_EMAIL not configured');
    return { id: null, error: new Error('RESEND_FROM_EMAIL not configured') };
  }

  const replyTo = opts.replyTo ?? process.env.RESEND_REPLY_TO_EMAIL;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(replyTo ? { replyTo } : {}),
    });
    if (error) {
      console.error('sendEmail: Resend returned error:', error);
      return { id: null, error };
    }
    return { id: data?.id ?? null, error: null };
  } catch (err) {
    console.error('sendEmail: send threw:', err);
    return { id: null, error: err };
  }
}
