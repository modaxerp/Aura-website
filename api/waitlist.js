const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function parseBody(req) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string') {
    return Object.fromEntries(new URLSearchParams(req.body));
  }
  return {};
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, app } = parseBody(req);

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // The optional `app` field (e.g. "aura-hydrate") tells us which page the
  // signup came from so Murat can triage signups in his inbox by subject
  // line. Falls back to a generic Aura Bionics tag if missing — keeps the
  // root umbrella waitlist working unchanged.
  const APP_LABELS = {
    'aura-hydrate': 'Aura Hydrate',
    'aura': 'Aura',
  };
  const appKey = (app || '').trim().toLowerCase();
  const appLabel = APP_LABELS[appKey] || 'Aura Bionics';
  const tag = appKey ? `Waitlist · ${appLabel}` : 'Waitlist · Aura Bionics';

  const from = process.env.EMAIL_FROM || 'Aura Bionics <onboarding@resend.dev>';
  const to = process.env.EMAIL_TO || 'info@aurabionics.com';

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: `[${tag}] ${email}`,
    html: `
      <h2>New Waitlist Signup</h2>
      <p><strong>App:</strong> ${appLabel}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><em>Received from aurabionics.com${appKey ? '/' + appKey : ''}</em></p>
    `,
    idempotencyKey: `waitlist-${appKey || 'umbrella'}-${Date.now()}-${email}`,
  });

  if (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, id: data?.id });
};
