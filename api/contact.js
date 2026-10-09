/**
 * POST /api/contact — delivers the website contact form to our inbox through Resend.
 *
 * Environment variables (set in Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY  required  API key from resend.com
 *   CONTACT_TO      required  inbox that receives enquiries, e.g. hello@malkaventures.com
 *   CONTACT_FROM    optional  verified sender, default "Malka Ventures <website@malkaventures.com>"
 *
 * Accepts JSON (from the page script) or a regular form post (when JavaScript is off).
 */

const MAX = { name: 120, email: 200, message: 5000 };
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const FALLBACK_EMAIL = 'hello@malkaventures.com';

function clean(value, max) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}

function oneLine(value) {
  return value.replace(/[\r\n]+/g, ' ');
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients and some form posts send none
  try {
    return new URL(origin).host === req.headers.host;
  } catch (e) {
    return false;
  }
}

function errorPage(lang) {
  const fr = lang === 'fr';
  const title = fr ? "Votre message n'a pas été envoyé" : 'Your message did not send';
  const body = fr ? 'Envoyez-le par courriel à' : 'Email it to';
  const back = fr ? 'Retour' : 'Go back';
  return '<!DOCTYPE html><html lang="' + (fr ? 'fr-CA' : 'en-CA') + '"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">' +
    '<title>' + title + '</title><link rel="stylesheet" href="/assets/styles.css"></head><body>' +
    '<main class="page"><div class="wrap"><div class="prose"><h1>' + title + '</h1>' +
    '<p>' + body + ' <a href="mailto:' + FALLBACK_EMAIL + '">' + FALLBACK_EMAIL + '</a>.</p>' +
    '<p><a class="btn btn-ink" href="' + (fr ? '/fr#contact' : '/#contact') + '">' + back + '</a></p>' +
    '</div></div></main></body></html>';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const wantsJson = String(req.headers['content-type'] || '').includes('application/json');
  const lang = body.lang === 'fr' ? 'fr' : 'en';

  const fail = (status, error) => {
    if (wantsJson) return res.status(status).json({ ok: false, error });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(status).send(errorPage(lang));
  };
  const succeed = () => {
    if (wantsJson) return res.status(200).json({ ok: true });
    return res.redirect(303, lang === 'fr' ? '/fr/merci' : '/thanks');
  };

  if (!sameOrigin(req)) return fail(403, 'forbidden');

  // Honeypot: real visitors never see or fill this field. Pretend it worked.
  if (clean(body.company, 200)) return succeed();

  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email);
  const message = clean(body.message, MAX.message);

  if (!name || !message || !EMAIL_RE.test(email)) return fail(400, 'invalid_input');

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM || 'Malka Ventures <website@malkaventures.com>';
  if (!apiKey || !to) {
    console.error('contact: RESEND_API_KEY or CONTACT_TO is not set');
    return fail(503, 'not_configured');
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: 'Website enquiry from ' + oneLine(name),
        text:
          'Name: ' + oneLine(name) + '\n' +
          'Email: ' + email + '\n' +
          'Page language: ' + lang + '\n\n' +
          message + '\n'
      })
    });
    if (!response.ok) {
      console.error('contact: Resend responded', response.status, await response.text());
      return fail(502, 'send_failed');
    }
  } catch (err) {
    console.error('contact: request to Resend failed', err);
    return fail(502, 'send_failed');
  }

  return succeed();
};
