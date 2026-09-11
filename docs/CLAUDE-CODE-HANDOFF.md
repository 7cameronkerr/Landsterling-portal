# Claude Code Handoff — Land Sterling Investment Portal Launch

This project was being launched via `docs/LAUNCH-RUNBOOK.md` in a Claude Cowork session
(cloud, file read/write only, no terminal on Cameron's machine). This note hands off to a
local Claude Code session, which has a real terminal here and can do the parts the cloud
session couldn't: `git push`, the Supabase CLI, `node --version`, driving anything
interactive.

**Follow `docs/LAUNCH-RUNBOOK.md` in this repo, in order, exactly as written.** It is the
authoritative source for every step, its verification check, and the ground rules
(never create accounts on Cameron's behalf, never enter or ask for account passwords,
never handle or write the Supabase `service_role` key or the Attio API key into any file
— Cameron pastes those directly into Supabase's dashboard himself). Verify every step for
real before ticking it; don't mark anything done on assumption. This note only records
where things stood as of 2026-09-11 so you don't re-ask what's already settled.

## Confirmed status (verified this session, do not re-check unless something looks wrong)

- **Git repo**: exists locally at the project root, but has **no `origin` remote yet**.
  Phase A2 (create the GitHub repo) and D3 (push) have not happened.
- **`public/js/config.js`**: `SUPABASE_URL` and `SUPABASE_ANON_KEY` are already live:
  - `SUPABASE_URL: 'https://psgasvgzhdgojuyykxyd.supabase.co'`
  - `SUPABASE_ANON_KEY: 'sb_publishable_VnfBSBu-FGxP1Kz3486B8g_AT_6qj5o'`
  This is the anon/publishable key — safe to have client-side. Don't overwrite it without
  checking with Cameron first.
- **`FORMSPREE_ENDPOINT`** and **`CALENDLY_URL`** in `config.js` are still blank — Cameron
  had not created a Formspree form or shared a Calendly link as of this handoff.
- **Netlify site, GitHub repo, Attio secrets (`CRM_API_KEY` / `CRM_PROVIDER` in Supabase
  Edge Function secrets), Node.js install** — all **unconfirmed**. Ask Cameron directly,
  don't assume any of them.
- **Supabase schema** (`supabase/schema.sql`) — **not confirmed as run** against the live
  project. Check the Table Editor for `profiles`, `opportunities`, `enquiries`,
  `activity_log`, `access_requests` before assuming Phase B2 is done.
- Supabase database password and account password are Cameron's; you were never given
  them and should never ask for or store them.

## What's different about this session vs. the Cowork one

- You have a terminal, so run the CLI/git steps directly rather than describing them:
  `npx supabase login` / `link` / `functions deploy`, `git remote add` / `push`,
  `node --version`. Confirm results by inspecting actual output, not by assuming success.
- For anything requiring Cameron's browser session in Supabase/Netlify/GitHub/Attio
  (creating the project, pasting the Attio key into secrets, Import from Git in Netlify),
  he does the clicking; you can talk him through it or drive it if he shares a screen, but
  never take an action described as **You** in the runbook on his behalf.
- Start Phase 0 by asking Cameron for whatever inputs aren't listed as confirmed above
  (GitHub repo URL once created, Netlify URL once created, Formspree endpoint, Calendly
  link, Node install status) — don't assume any of them from this note.

**Project root:** `C:\Users\cameron.kerr\Desktop\landsterling-portal`
