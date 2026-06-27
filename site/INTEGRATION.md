# kei22 Integration Notes

Project folder: `C:\Users\tema\Downloads\kei22\site`

## Site Pages

| URL | File |
|-----|------|
| `/` | `index.html` |
| `/international-real-estate` | `international-real-estate.html` |

## Completed

- [x] Main page contacts, forms, WhatsApp, and email are configured.
- [x] Catalog assets are included in the site export.
- [x] Catalog page uses the same form and contact updates.
- [x] Main menu links to `/international-real-estate`.
- [x] Catalog menu links to `/`, `/#service`, and `#contacts`.
- [x] Web3Forms integration is enabled.
- [x] Phone forms default to the US `+1` mask.
- [x] Non-English visible texts and legacy country-code mentions were removed.

## Forms

Requests are sent to **kustovaestatei1182@gmail.com** through Web3Forms directly from the browser.

### Bot protection

The site uses layered protection:

- Honeypot fields and minimum fill time (client-side)
- Google reCAPTCHA v2 (optional until keys are configured)
- Optional Botfaqtor traffic analysis script

### Client configuration

Edit `js/site-config.js`:

- `web3formsAccessKey` — Web3Forms access key from https://web3forms.com/
- `recaptchaSiteKey` — public reCAPTCHA v2 site key for `kei22.com`
- `KEI22_BOTFAQTOR.scriptSrc` — script URL copied from Botfaqtor dashboard (Settings → Install counter)

Register reCAPTCHA keys at https://www.google.com/recaptcha/admin (type: **v2 checkbox**). Add domains: `kei22.com`, `www.kei22.com`, `kei222.com`, `www.kei222.com`, `localhost`.

### Cloudflare (recommended)

1. Move DNS for `kei22.com` to Cloudflare.
2. Enable proxy (orange cloud) for web records.
3. Turn on **Bot Fight Mode** under Security → Bots.
4. Use **Full (strict)** SSL mode.

## Local Preview

Set `web3formsAccessKey` in `js/site-config.js`, then preview locally:

```bash
cd site
npx serve .
```

## Deploy

```bash
cd C:\Users\tema\Downloads\kei22\site
npx vercel
```

npx vercel --prod