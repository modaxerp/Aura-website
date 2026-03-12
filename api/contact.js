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

  const { name, email, message } = parseBody(req);

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Name, email and message are required' });
  }

  const from = process.env.EMAIL_FROM || 'Aura Bionics <onboarding@resend.dev>';
  const to = process.env.EMAIL_TO || 'info@aurabionics.com';

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    replyTo: [email],
    subject: `[Contact] ${name} - ${email}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <pre style="white-space: pre-wrap; font-family: inherit;">${message}</pre>
      <p><em>Received from aurabionics.com</em></p>
    `,
    idempotencyKey: `contact-${Date.now()}-${email}`,
  });

  if (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, id: data?.id });
};
