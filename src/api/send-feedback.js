import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, message, page } = req.body;

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'amberrdev@gmail.com',
    subject: `[KennelCheck Feedback] ${type}`,
    html: `
      <p><strong>Type:</strong> ${type}</p>
      <p><strong>Page:</strong> ${page}</p>
      <p><strong>Message:</strong> ${message}</p>
    `
  });

  res.status(200).json({ ok: true });
}