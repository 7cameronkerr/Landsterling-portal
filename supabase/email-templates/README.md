# Branded email templates

Paste these into **Supabase → Authentication → Email Templates** (during tomorrow's setup):

| File | Supabase template | Notes |
|------|-------------------|-------|
| `invite.html` | **Invite user** | Used when you invite/approve a client → links to `activation.html` (NDA + password). |
| `reset-password.html` | **Reset Password** | Used for "forgot password". Links to `reset.html`. |

**Important:** keep the `{{ .ConfirmationURL }}` variable intact — it carries the secure one-time link.

For the redirect to land on the right page, also set **Authentication → URL Configuration → Redirect URLs** to include:
- `https://YOUR-SITE/activation.html`
- `https://YOUR-SITE/reset.html`

These templates use inline styles and table layout for broad email-client compatibility.
For fully branded sending from your own domain (rather than a generic Supabase address),
configure **custom SMTP** (e.g. Resend) once your domain DNS is ready.
