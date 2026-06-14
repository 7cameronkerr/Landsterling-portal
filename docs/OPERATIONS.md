# Operations: version control, deploys, backups

This covers items 37 (GitHub + auto-deploy + rollback) and 38 (backups + exports).
Most of this is set up once, with me, after the Supabase session.

## Version control (GitHub) + automatic deploys

The project is already a local Git repository. To get versioned, one-click deploys with rollback:

1. Create a private repo at https://github.com/new (e.g. `landsterling-portal`).
2. Push this project to it (I can run these with you):
   ```bash
   git remote add origin https://github.com/<you>/landsterling-portal.git
   git branch -M main
   git push -u origin main
   ```
3. In **Netlify → Add new site → Import from Git**, pick the repo. Set **publish directory = `public`**
   (the included `netlify.toml` already does this).
4. From then on: every change you approve gets committed and **auto-deploys**. Netlify keeps every
   previous deploy, so **rollback is one click** (Deploys → pick a previous deploy → "Publish deploy").

> Only the public Supabase *anon* key lives in `config.js`. Secret keys (service-role, CRM) live only
> in Supabase as Function secrets and are never committed.

## Backups & exports (item 38)

**Database (Supabase):**
- Supabase **Pro** includes automatic **daily backups** (7-day retention) + point-in-time recovery.
- On the **Free** tier, take periodic manual snapshots: Supabase → Database → Backups, or export tables
  from the Table Editor as CSV.

**Lead/CRM export anytime:** Table Editor → `profiles`, `enquiries`, `access_requests`, `activity_log`
→ Export → CSV. (This is your mailshot / opportunity-matching list — item 15/35/36.)

**Front-end:** the site is fully reproducible from this Git repo, so the code is its own backup.

## Routine maintenance

- **Content** (opportunities, approvals, enquiries) → the admin panel, no deploys needed.
- **Code/feature changes** → a short dev session, committed to Git, auto-deployed, rollback available.
- **Supabase platform patching** is handled by Supabase (managed) — nothing for you to patch.
