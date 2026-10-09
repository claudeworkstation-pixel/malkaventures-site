# malkaventures.com

Static site for Malka Ventures, deployed on Vercel. No build step.

## Layout

| Path | What it is |
| --- | --- |
| `index.html`, `fr/index.html` | Home page, English and French |
| `privacy.html`, `fr/confidentialite.html` | Privacy policy |
| `thanks.html`, `fr/merci.html` | Confirmation shown after a form post when JavaScript is off |
| `assets/styles.css` | All styles. Colours are tokens at the top of the file |
| `assets/site.js` | Mobile menu and contact form |
| `assets/fonts/` | Self-hosted fonts (Bricolage Grotesque, Figtree; SIL OFL) |
| `api/contact.js` | Serverless function that emails contact form messages |
| `vercel.json` | Clean URLs, security headers, cache rules |

The English and French pages share the same markup. When you change one, make the same change in the other.

## Contact form setup

The form posts to `/api/contact`, which sends the message through [Resend](https://resend.com).
Set these in Vercel → Project → Settings → Environment Variables, then redeploy:

| Variable | Required | Value |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | A Resend API key |
| `CONTACT_TO` | yes | Inbox that receives enquiries |
| `CONTACT_FROM` | no | Sender on a domain verified in Resend. Default: `Malka Ventures <website@malkaventures.com>` |

Until the variables are set, the form shows "Your message did not send" with a link that opens the visitor's email app, so no enquiry is silently dropped.

## Analytics

The pages load Vercel Web Analytics (`/_vercel/insights/script.js`). It records nothing until Web Analytics is enabled for the project in the Vercel dashboard.

## Changing colours

Edit the custom properties under `:root` in `assets/styles.css`: `--sun` is the brand yellow, `--ink` is the text colour, and `--chloe`, `--tena` and `--layoff` are the three product colours.

## Preview locally

```
npx vercel dev
```

or, for the static pages only, `python3 -m http.server` (clean URLs such as `/privacy` need the `.html` suffix in that case).
