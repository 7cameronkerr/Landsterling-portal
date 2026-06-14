# Land Sterling Investment Portal

A password-protected investment portal with client approval, an admin CMS, and
enquiry capture — built on the existing design, powered by Supabase.

> **New here? Start with [`SETUP.md`](SETUP.md).** It walks you through going live
> in ~30 minutes using free services.

## The three capabilities

1. **Password access + approval** — real login via Supabase Auth, with two onboarding paths:
   - *You invite a client* → they get an email to set a password → auto-approved.
   - *A client self-registers* → status is **pending** → you approve them in the admin panel.
2. **Quick opportunity uploads** — `admin.html` has a friendly form (metrics & highlights
   included) to add / edit / publish / remove listings. No code editing.
3. **Enquiries to your email** — every CTA submission is saved to the admin **Enquiries**
   inbox and emailed to you (via Formspree).

## Project layout

| Path | Purpose |
|------|---------|
| `public/index.html` | The client-facing portal (your original design) |
| `public/admin.html` | Admin panel: approvals, opportunity CMS, enquiries |
| `public/reset.html` | "Set your password" page for invites & resets |
| `public/js/config.js` | **Your Supabase keys go here** |
| `public/js/api.js` | Supabase wiring (shared) |
| `public/js/seed-data.js` | Original 8 opportunities (one-click import) |
| `supabase/schema.sql` | Database tables + security rules (run once) |
| `supabase/functions/invite-client/` | Edge function for the in-app invite button |
| `serve.ps1` | Optional local preview server (`powershell -File serve.ps1` → http://localhost:8753) |

## Local preview

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```
Then open http://localhost:8753 . Without keys in `config.js` it runs in preview mode
(shows the gate and the bundled sample opportunities).

## Deploy

Drag the `public/` folder to https://app.netlify.com/drop . See `SETUP.md` Step 7.
