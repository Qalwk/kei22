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

Requests are sent to **kustovaestatei1182@gmail.com** through Web3Forms.

The access key is configured in `js/site-config.js`.

## Local Preview

Use a local static server for form and asset testing:

```bash
cd C:\Users\tema\Downloads\kei22\site
npx serve .
```

Open: http://localhost:3000

## Deploy

```bash
cd C:\Users\tema\Downloads\kei22\site
npx vercel
```

npx vercel --prod