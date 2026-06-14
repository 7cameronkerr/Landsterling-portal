# Land Sterling Investment Portal — Setup Guide

This turns the design into a live, password-protected website with:

1. **Real password login + an approval workflow** (two onboarding paths)
2. **A quick admin panel** to upload / edit opportunities
3. **Enquiries** that land in your admin inbox **and** your email

Everything below uses **free tiers**. Budget ~30–40 minutes the first time.
You do not need to be a developer — just follow the steps in order.

---

## What's in this folder

```
landsterling-portal/
├── public/                ← the website (this is what gets deployed)
│   ├── index.html         ← the client-facing portal
│   ├── admin.html         ← YOUR admin panel (approvals, uploads, enquiries)
│   ├── reset.html         ← "set your password" page (invites & resets)
│   └── js/
│       ├── config.js      ← ⚠️ you paste your 2 keys here (Step 4)
│       ├── api.js         ← backend wiring (don't edit)
│       └── seed-data.js   ← your original 8 opportunities (for one-click import)
├── supabase/
│   ├── schema.sql         ← the database (run once, Step 2)
│   └── functions/invite-client/  ← optional: in-app "Invite client" button (Step 8)
└── SETUP.md               ← this file
```

---

## Step 1 — Create your Supabase project (the backend)

1. Go to **https://supabase.com** → **Start your project** → sign in with GitHub or email.
2. Click **New project**. Pick a name (e.g. `landsterling-portal`), a strong database
   password (save it somewhere), and the region closest to your users (e.g. *Middle East*).
3. Wait ~2 minutes for it to provision.

## Step 2 — Create the database tables

1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this folder, copy **all** of it, paste it in, click **Run**.
3. You should see *“Success. No rows returned.”* That created your `profiles`,
   `opportunities`, and `enquiries` tables plus the security rules.

## Step 3 — Auth settings

1. Go to **Authentication → Sign In / Providers → Email** and make sure **Email** is enabled.
2. **Email confirmations:** for the smoothest start you can leave the default ON (more secure).
   - With it ON: a self-registered client must click a confirmation email **and** be approved by you.
   - If you'd rather skip confirmation while testing, you can turn **“Confirm email”** off here.

## Step 4 — Connect the website to Supabase

1. Go to **Project Settings → API**.
2. Copy two values:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon / public** API key (a long string)
3. Open `public/js/config.js` and paste them in:
   ```js
   SUPABASE_URL:      'https://abcdxyz.supabase.co',
   SUPABASE_ANON_KEY: 'paste-the-anon-public-key-here',
   ```
   > These two keys are **meant** to be public — your data is protected by the
   > security rules in `schema.sql`. Never paste the *service_role* key here.

## Step 5 — Create YOUR admin account

1. In Supabase: **Authentication → Users → Add user → Create new user**.
   Enter your email (`Cameron.k@landsterling.com`) and a password. Tick **Auto Confirm User**.
2. Back in **SQL Editor**, run this to make yourself the administrator:
   ```sql
   update public.profiles
   set role = 'admin', status = 'approved'
   where email = 'Cameron.k@landsterling.com';
   ```
3. You can now open `public/admin.html` and sign in with that email + password.

## Step 6 — Load your existing opportunities

1. Open **admin.html**, sign in, go to the **Opportunities** tab.
2. Click **“Import starter data.”** Your original eight listings load into the database.
3. From now on, use **+ New Opportunity** / **Edit** to manage content — no code needed.

---

## Step 7 — Put it online (free)

The `public` folder is a normal static website. Easiest host: **Netlify Drop**.

1. Go to **https://app.netlify.com/drop**.
2. Drag the **`public`** folder onto the page. In a few seconds you get a live URL like
   `https://your-portal-name.netlify.app`.
3. Open that URL — you'll see the portal with the **Sign In / Request Access** gate.
4. **Important:** go back to Supabase → **Authentication → URL Configuration** and set:
   - **Site URL:** your Netlify URL (e.g. `https://your-portal-name.netlify.app`)
   - **Redirect URLs:** add `https://your-portal-name.netlify.app/reset.html`
   This makes invite & password-reset email links work correctly.

*(A custom domain like `invest.landsterling.com` can be added later in Netlify →
Domain settings. You said DNS isn't sorted yet, so the free `.netlify.app` address
is perfect to launch with.)*

## Step 8 — Enquiry emails to your inbox (Requirement 3)

Enquiries are **always** saved to your admin **Enquiries** tab. To also get an **email**
the moment someone clicks a CTA:

1. Go to **https://formspree.io**, sign up (free), create a form, and set the
   notification email to `Cameron.k@landsterling.com`.
2. Copy the form endpoint (looks like `https://formspree.io/f/abcdwxyz`).
3. Paste it into `public/js/config.js`:
   ```js
   FORMSPREE_ENDPOINT: 'https://formspree.io/f/abcdwxyz',
   ```
4. Re-deploy (drag the `public` folder to Netlify Drop again). Done.

## Step 9 — The “Invite Client” button (Onboarding Path A)

You have **two ways** to invite a client directly (vs. them self-registering):

**Option A (zero code, works now):** In Supabase → **Authentication → Users → Invite user**
→ enter their email. They get an email to set a password. Then approve them in your
admin **Approvals** tab.

**Option B (one-click button inside admin.html):** deploy the included edge function so
the **“+ Invite Client”** button works and auto-approves the client:
1. Install the Supabase CLI (https://supabase.com/docs/guides/cli) **or** use the
   dashboard **Edge Functions → Create function** editor.
2. Deploy `supabase/functions/invite-client/index.ts` as a function named `invite-client`.
   (CLI: `supabase functions deploy invite-client`.)
3. No secrets to set — Supabase injects them automatically.

---

## How the two onboarding paths behave

| | **Path A — you invite** | **Path B — they self-register** |
|---|---|---|
| Trigger | You click *Invite Client* (or dashboard Invite) | Client uses *Request Access* on the portal |
| Client action | Receives email → sets password | Fills details + sets password |
| Approval | **Auto-approved** | **Pending → you approve** in Approvals tab |
| Result | Logs in immediately | Logs in once you approve |

## Daily use, in one minute

- **Approve someone:** admin.html → **Approvals** → **Approve**.
- **Add a deal:** admin.html → **Opportunities** → **+ New Opportunity**.
- **Read enquiries:** admin.html → **Enquiries** (also emailed to you).

## Troubleshooting

- *“Backend not connected”* → you haven't pasted your keys in `config.js` (Step 4),
  or you didn't re-deploy after editing it.
- *Invite / reset link says “invalid or expired”* → check the **Redirect URLs** in Step 7.4.
- *Self-registered user can't log in* → they're **pending**; approve them (and, if email
  confirmation is on, they must confirm their email first).

---

Built on your existing design — nothing about the look and feel changed.
