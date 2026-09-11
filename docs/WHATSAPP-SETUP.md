# WhatsApp Notifications — External Setup Checklist

The application side is already built (`supabase/functions/notify-whatsapp`) and wired
in to fire alongside every existing email notification — new access requests, every
enquiry type (particulars, data room, further details, call-back, research). **It does
nothing until you configure one of the two options below** — email notifications keep
working exactly as before either way.

## Option A — Twilio (recommended to start: simplest setup, Twilio manages the WhatsApp infrastructure)

1. Create a free account at [twilio.com](https://www.twilio.com).
2. In the console, activate the **WhatsApp Sandbox** (Messaging → Try it out → Send a WhatsApp message) —
   good enough to test immediately; for production sending to yourself only, the sandbox is actually sufficient
   long-term since you're the only recipient.
3. From your phone, send the sandbox's "join <code>" message to the Twilio sandbox number once — this
   opts your number in to receive messages.
4. Note your **Account SID** and **Auth Token** (Twilio Console dashboard).
5. In Supabase → Edge Functions → Secrets, add:
   - `WHATSAPP_PROVIDER` = `twilio`
   - `TWILIO_ACCOUNT_SID` = *(from step 4)*
   - `TWILIO_AUTH_TOKEN` = *(from step 4)*
   - `TWILIO_WHATSAPP_FROM` = `whatsapp:+14155238886` *(Twilio's sandbox number, or your approved sender once you move to production)*
   - `NOTIFY_WHATSAPP_TO` = `whatsapp:+971509005736` *(your number)*
6. Deploy `supabase/functions/notify-whatsapp` (Edge Functions → Create → paste the file → Deploy — same
   process used for `invite-client` and `crm-sync`).
7. Submit a test enquiry on the portal — you should get a WhatsApp within seconds.

**Cost**: ~$0.005–0.055 per message depending on region/template — for a single recipient (you), this is
a few dollars a month at most, billed to your Twilio account.

## Option B — Meta WhatsApp Cloud API direct (cheaper per message, more setup)

1. Create a Meta Business Account and a WhatsApp Business Platform app in
   [Meta for Developers](https://developers.facebook.com).
2. Add a phone number to the WhatsApp product (a dedicated number, not your personal one).
3. Generate a permanent access token (System User token, not the 24-hour test token).
4. **Create and get approval for a message template** — business-initiated notifications
   outside a conversation you started require a Meta-approved template (this typically
   takes a few hours to a day for approval). A simple one-variable template like
   *"New portal activity: {{1}}"* is enough — the function fills in the full details.
5. In Supabase → Edge Functions → Secrets, add:
   - `WHATSAPP_PROVIDER` = `meta`
   - `META_WA_TOKEN` = *(from step 3)*
   - `META_WA_PHONE_ID` = *(the phone number ID from step 2)*
   - `META_WA_TEMPLATE_NAME` = *(your approved template name from step 4)*
   - `NOTIFY_WHATSAPP_TO` = `971509005736` *(your number, no "whatsapp:" prefix)*
6. Deploy `supabase/functions/notify-whatsapp` as above.

**Cost**: Meta charges per template message by category/country (roughly $0.003–0.05) — no Twilio markup.
More setup, cheaper at any real volume; irrelevant at your volume, so Option A is the practical choice
unless you specifically want to avoid Twilio as a middleman.

## What you'll receive

A message like:

```
Requested particulars
John Smith
ABC Capital
+971 XX XXX XXXX
DIC Freehold Office Building
Budget: AED 50M-100M
Comment: Interested in the yield profile
```

## Notes
- Both providers are optional and independent of everything else — the portal, email
  notifications, and CRM sync all work with zero WhatsApp setup.
- No credentials are ever written into the codebase; they live only as Supabase Function
  secrets, the same pattern as the Attio and Resend credentials already in use.
