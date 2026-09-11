# Land Sterling Investment Portal — Launch Runbook

> **How to run this file.** Open it in Claude Cowork alongside the project folder
> (`landsterling-portal`) and say: *"Run the launch runbook with me."* Claude works down
> the steps in order, does every step tagged **Claude**, asks you for each item tagged
> **You** at the moment it is needed, and confirms every step with the **Verify** check
> before moving on. Tick the boxes as you go.
>
> **Ground rules for Claude:** never create accounts, never enter passwords, secret keys
> or payment details anywhere, never paste the Supabase *service_role* key or the Attio
> key into a file. Ask Cameron to do those. The Supabase *anon* key is public by design
> and may be written into `public/js/config.js`. Verify each step; do not mark a step done
> on assumption. If a step fails, stop and diagnose before continuing.

**Outcome:** a live, password-gated portal hosted in Cameron's own accounts (GitHub →
Netlify), logins on Cameron's Supabase project with approval + NDA e-sign activation, and
every registration, enquiry and login flowing into Attio.

**Project root:** `C:\Users\cameron.kerr\Desktop\landsterling-portal`
**Realistic time:** one focused ~3-hour session together, then content entry in the admin.

---

## 0 · Inputs to collect (Claude asks for each when it is needed)

| Input | Where it comes from | Who |
|---|---|---|
| Supabase **Project URL** | Supabase → Project Settings → API | You |
| Supabase **anon public key** | same page | You |
| GitHub repo URL | github.com/new (private) | You |
| Netlify site URL | after "Import from Git" | You |
| Formspree endpoint | formspree.io → new form | You |
| Calendly booking link | calendly.com | You |
| Attio API key | Attio → Settings → Developers (you paste it into Supabase secrets yourself) | You |
| Node.js installed? | nodejs.org LTS (recommended, enables CLI deploys) | You |

---

## Phase A · Your accounts (≈30 min, one sitting) — all **You**

- [ ] **A1 Supabase project.** supabase.com → New project (free tier). Region: closest to the UAE. Save the database password somewhere safe (Claude never needs it).
  *Verify:* Project Settings → API shows a Project URL and an anon key. Send both to Claude.
- [ ] **A2 GitHub repo.** github.com/new → name `landsterling-portal`, **Private**, no README.
  *Verify:* the empty repo page shows the "push an existing repository" commands.
- [ ] **A3 Netlify.** netlify.com → Add new site → **Import from Git** → pick the repo. Publish directory is already set by `netlify.toml` (`public`).
  *Verify:* a first deploy runs (it may 404 until code is pushed in D3 — that's fine).
- [ ] **A4 Formspree.** formspree.io → New form → notification email `Cameron.k@landsterling.com`.
  *Verify:* you have an endpoint like `https://formspree.io/f/xxxx`. Send it to Claude.
- [ ] **A5 Calendly.** Copy your booking link. Send it to Claude.
- [ ] **A6 Attio API key.** Attio → Settings → Developers → create key. Then in Supabase → **Edge Functions → Secrets** add `CRM_API_KEY` = the key and `CRM_PROVIDER` = `attio`. *(You paste it; Claude does not handle it.)*
  *Verify:* both secrets listed.
- [ ] **A7 Node.js (recommended).** nodejs.org → LTS installer, defaults.
  *Verify (Claude):* `node --version` prints a version in a new PowerShell.

---

## Phase B · Wire the backend (≈1½ h) — mostly **Claude**

- [ ] **B1 Keys into config.** *(Claude)* Write the Project URL and anon key into `public/js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Also set `FORMSPREE_ENDPOINT` and `CALENDLY_URL` if already available.
  *Verify:* open `http://localhost:8753` (run `serve.ps1`): the gate no longer shows the "Explore the portal without signing in" preview link.
- [ ] **B2 Run the schema.** *(Together)* Supabase → SQL Editor → New query → paste the whole of `supabase/schema.sql` → Run. Claude can drive Cameron's logged-in dashboard, or Cameron pastes.
  *Verify:* Table Editor lists `profiles`, `opportunities`, `enquiries`, `activity_log`, `access_requests`. Re-running the file is safe (idempotent).
- [ ] **B3 Admin login.** *(You)* Supabase → Authentication → Users → **Add user → Create new user**: `Cameron.k@landsterling.com`, a password you choose, tick **Auto Confirm User**.
  *(Claude)* then run in SQL Editor:
  ```sql
  update public.profiles set role = 'admin', status = 'approved'
  where email = 'Cameron.k@landsterling.com';
  ```
  *Verify:* `public/admin.html` login works and shows the Approvals / Opportunities / Enquiries tabs.
- [ ] **B4 Auth configuration.** *(Claude, via Cameron's dashboard)*
  - Authentication → Email Templates: paste `supabase/email-templates/invite.html` into **Invite user**, `reset-password.html` into **Reset password** (keep `{{ .ConfirmationURL }}`).
  - Authentication → URL Configuration: **Site URL** = the live site URL (use `http://localhost:8753` until D3); **Redirect URLs** add `<site>/activation.html` and `<site>/reset.html`.
  *Verify:* both templates saved; both redirect URLs listed.
- [ ] **B5 Deploy the edge functions.** *(Claude)*
  With Node: `npx supabase login` (Cameron completes the browser login) → `npx supabase link --project-ref <ref>` → `npx supabase functions deploy invite-client` → `npx supabase functions deploy crm-sync`.
  Without Node: Supabase → Edge Functions → Create → paste `supabase/functions/invite-client/index.ts`; repeat for `crm-sync`.
  *Verify:* both functions listed as deployed; invoking `invite-client` without a token returns `401 Not authenticated` (expected).
- [ ] **B6 Database webhook → CRM.** *(Claude)* Supabase → Database → Webhooks → Create: events **INSERT** on `access_requests` and on `enquiries` → type *Supabase Edge Function* → `crm-sync`.
  *Verify:* the webhook appears enabled for both tables.
- [ ] **B7 Onboarding end-to-end.** *(Together — Cameron receives the real emails)*
  1. Portal → Request Access with a test email you control → *Verify:* it appears in admin → Approvals as a pending request.
  2. Admin → **Approve & invite** → *Verify:* an activation email arrives; the link opens `activation.html`.
  3. Sign the NDA + set a password → *Verify:* redirected into the portal; `profiles` row shows `nda_signed_at`, `nda_name`, `nda_ip`.
  4. Admin → **+ Invite Client** with a second test email → *Verify:* same activation flow works.
  5. Sign out / sign in with the new password → *Verify:* `activity_log` gains a `login` row; open a deal → a `view_opportunity` row.

---

## Phase C · Your CRM — Attio (≈45 min) — **Claude**

- [ ] **C1 Map Attio.** *(Claude, using the connected Attio integration)* Inspect the workspace's People attributes; create a list **Portal Leads**; add Person attributes `last_login` (date), `deals_viewed` (number), `last_viewed_deal` (text) if absent. Confirm `crm-sync` field mapping matches the workspace (email, name, phone, company, source, opportunity).
  *Verify:* list exists; attributes present.
- [ ] **C2 Prove the sync.** *(Together)* Submit one Request Access and one Request Particulars from the portal.
  *Verify:* both appear as People in Attio within seconds, on the Portal Leads list, with source and opportunity filled.

---

## Phase D · Content, deploy, go live (≈1 h + content time)

- [ ] **D1 Flagship template locked.** *(Claude)* Deal-page presentation and metric structure finalised (image-led hero, key-figures band, grouped metrics, data-room + particulars CTAs, mobile action bar).
  *Verify:* Cameron signs off one deal on his phone.
- [ ] **D2 Content.** *(You, ongoing)* Admin → Opportunities → **Import starter data** (loads the eight listings) → edit, add images, publish.
  *Verify:* the Asset Library shows the published deals; unpublished ones are hidden.
- [ ] **D3 Deploy.** *(Claude)* From the project folder:
  ```bash
  git remote add origin https://github.com/<you>/landsterling-portal.git
  git branch -M main
  git push -u origin main
  ```
  (Cameron completes any GitHub sign-in prompt.) Netlify auto-deploys.
  *Verify:* the `netlify.app` URL loads the gate. Then set Supabase Site URL + redirect URLs to the live address (B4) and update `config.js` Calendly/Formspree if not yet set; push again.
- [ ] **D4 Live end-to-end on a phone.** *(Together)* Repeat B7 steps 1–5 on the live URL from Cameron's phone, then Request Particulars, Request Data Room and Request Further Details once each.
  *Verify:* each appears in admin → Enquiries, in the Formspree email, and in Attio.
- [ ] **D5 Legal sign-off.** *(You)* NDA (`activation.html`), `privacy.html`, `terms.html` reviewed by counsel; remove the yellow "DRAFT for legal review" banners when approved (Claude does the edit).
- [ ] **D6 Soft launch.** *(You)* Invite one trusted client from the admin; watch the full journey.
- [ ] **D7 Custom domain (later).** *(Together)* Netlify → Domain settings → add `invest.landsterling.com`; DNS CNAME as instructed; update Supabase Site/redirect URLs; optionally custom SMTP so emails send from your domain.

---

## Appendix

**Rollback:** Netlify → Deploys → pick a previous deploy → *Publish deploy*. Code history is in Git (`git log`).

**Backups:** Supabase Pro has daily backups; on Free, export tables (Table Editor → Export CSV) before big changes. Your lead list is `profiles` + `access_requests` + `enquiries` + `activity_log`.

**Where things live**
- Front-end: `public/` (index, admin, activation, reset, privacy, terms; `js/config.js` holds all keys/links)
- Database + rules: `supabase/schema.sql`
- Edge functions: `supabase/functions/invite-client`, `supabase/functions/crm-sync`
- Email templates: `supabase/email-templates/`
- Ops notes: `docs/OPERATIONS.md`, setup detail: `SETUP.md`

**Only Cameron can do:** create the accounts · choose his admin password · paste the Attio key into Supabase secrets · click "Import from Git" in Netlify · legal sign-off · DNS.
