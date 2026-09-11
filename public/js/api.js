/* ============================================================================
 *  LAND STERLING PORTAL — API LAYER
 *  Thin wrapper around Supabase used by both index.html and admin.html.
 *  Requires: config.js and the Supabase JS SDK loaded before this file.
 * ========================================================================== */
(function () {
  const cfg = window.LS_CONFIG || {};
  const ready = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT');

  // Create the client (or a null stand-in if keys aren't filled in yet)
  const sb = ready
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  function assertReady() {
    if (!sb) throw new Error(
      'Supabase is not configured yet. Add your keys in public/js/config.js (see SETUP.md).'
    );
  }

  const API = {
    configured: !!sb,
    client: sb,

    /* ---- AUTH -------------------------------------------------------- */

    // Path B — client self-registers with full details + password.
    // status defaults to 'pending' → you approve them in the admin panel.
    async register({ email, password, firstName, lastName, mobile, company }) {
      assertReady();
      return sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name:  lastName,
            mobile,
            company,
            status: 'pending'
          }
        }
      });
    },

    // Path B (current model) — self-registration captures DETAILS ONLY, no password.
    // Cameron approves in the admin, which sends the activation invite; the client
    // then signs the NDA and sets a password in one step (activation.html).
    async requestAccess({ firstName, lastName, email, mobile, company, consent }) {
      assertReady();
      const record = {
        first_name: firstName,
        last_name:  lastName,
        email,
        mobile,
        company,
        consent: !!consent
      };
      const result = await sb.from('access_requests').insert([record]);
      syncToCrm('access_requests', record);
      notifyByEmail({ type: 'Portal Access Request', name: `${firstName} ${lastName}`.trim(), email, phone: mobile, company });
      notifyByWhatsApp('access_requests', record);
      return result;
    },

    async signIn(email, password) {
      assertReady();
      return sb.auth.signInWithPassword({ email, password });
    },

    // Passwordless return visits: emails a one-click sign-in link. Native
    // Supabase capability — no new service, no password to remember or reset.
    async sendMagicLink(email, redirectTo) {
      assertReady();
      return sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
    },

    async signOut() {
      assertReady();
      return sb.auth.signOut();
    },

    // Used by the "set / reset password" pages.
    async sendPasswordReset(email, redirectTo) {
      assertReady();
      return sb.auth.resetPasswordForEmail(email, { redirectTo });
    },

    async updatePassword(newPassword) {
      assertReady();
      return sb.auth.updateUser({ password: newPassword });
    },

    async getSession() {
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data.session;
    },

    onAuthChange(cb) {
      if (!sb) return;
      sb.auth.onAuthStateChange((_event, session) => cb(session));
    },

    // The current user's profile row (role + approval status live here).
    async getProfile() {
      assertReady();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      const { data, error } = await sb
        .from('profiles').select('*').eq('id', user.id).single();
      if (error) return null;
      return data;
    },

    // Combined activation: set password, capture mobile/company (belt-and-braces
    // for invites that didn't carry them), and record the signed NDA — one step.
    async activateAccount({ password, ndaName, ndaVersion, mobile, company }) {
      assertReady();
      const { error: pErr } = await sb.auth.updateUser({ password });
      if (pErr) return { error: pErr };
      let ip = null;
      try { const r = await fetch('https://api.ipify.org?format=json'); ip = (await r.json()).ip; } catch (e) {}
      const { data: { user } } = await sb.auth.getUser();
      const patch = {
        nda_signed_at: new Date().toISOString(),
        nda_name:      ndaName,
        nda_version:   ndaVersion,
        nda_ip:        ip
      };
      if (mobile)  patch.mobile  = mobile;
      if (company) patch.company = company;
      const { error: uErr } = await sb.from('profiles').update(patch).eq('id', user.id);
      return { error: uErr || null };
    },

    // Lightweight engagement logging (sign-in, opportunity views) — feeds CRM.
    async logActivity(eventType, oppSlug) {
      if (!sb) return;
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;
        await sb.from('activity_log').insert([{
          user_id: user.id, event_type: eventType, opportunity_slug: oppSlug || null
        }]);
      } catch (e) {}
    },

    /* ---- OPPORTUNITIES ----------------------------------------------- */

    async fetchOpportunities() {
      assertReady();
      const { data, error } = await sb
        .from('opportunities')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(rowToOpportunity);
    },

    /* ---- SHORTLIST (saved opportunities) ------------------------------ */
    // Private per-investor watchlist — acquisition decisions play out over
    // weeks, not one browsing session. Silently no-ops when signed out
    // (there's nothing to persist to), never throws into the caller.

    async getSavedOpportunityIds() {
      if (!sb) return [];
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return [];
        const { data, error } = await sb.from('saved_opportunities').select('opportunity_id').eq('user_id', user.id);
        if (error) return [];
        return (data || []).map(r => r.opportunity_id);
      } catch (e) { return []; }
    },

    async saveOpportunity(opportunityUuid) {
      assertReady();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sign in to save opportunities.');
      const { error } = await sb.from('saved_opportunities')
        .insert([{ user_id: user.id, opportunity_id: opportunityUuid }]);
      // Already saved (unique constraint) is not an error from the caller's
      // point of view — the end state (saved) is what was asked for.
      if (error && error.code !== '23505') throw error;
      return true;
    },

    async unsaveOpportunity(opportunityUuid) {
      assertReady();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sign in to manage your shortlist.');
      const { error } = await sb.from('saved_opportunities')
        .delete().eq('user_id', user.id).eq('opportunity_id', opportunityUuid);
      if (error) throw error;
      return true;
    },

    /* ---- ENQUIRIES --------------------------------------------------- */

    async submitEnquiry(payload) {
      assertReady();
      // Link to the submitter's real profile when they're signed in, so every
      // action is traceable to one contact instead of a freestanding text row.
      let record = payload;
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (user) record = { ...payload, user_id: user.id };
      } catch (e) {}
      // 1. Save to the database (your admin inbox). If the newer columns
      // (user_id/budget/target_location) haven't been migrated in yet, retry
      // without them rather than losing the lead — never let a schema-timing
      // gap break the portal's core conversion action.
      let { error } = await sb.from('enquiries').insert([record]);
      if (error && (error.code === 'PGRST204' || error.code === '42703')) {
        const { user_id, budget, target_location, ...legacy } = record;
        ({ error } = await sb.from('enquiries').insert([legacy]));
        if (!error) record = legacy;
      }
      // 2. Also email you via Formspree, if configured (best-effort)
      notifyByEmail(record);
      if (error) throw error;
      syncToCrm('enquiries', record);
      notifyByWhatsApp('enquiries', record);
      return true;
    }
  };

  // Best-effort email notification to you via Formspree — used for both
  // enquiries and new access requests, so you hear about both immediately.
  // Never blocks or fails the caller (the DB record is what matters), but a
  // rejected submission (e.g. a required field Formspree got blank) is
  // logged rather than silently dropped — fetch() doesn't reject on 4xx/5xx,
  // only on a real network failure, so this checks response.ok explicitly.
  function notifyByEmail(payload) {
    if (!cfg.FORMSPREE_ENDPOINT) return;
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => fd.append(k, v ?? ''));
    fetch(cfg.FORMSPREE_ENDPOINT, {
      method: 'POST', headers: { Accept: 'application/json' }, body: fd
    }).then(res => {
      if (!res.ok) res.json().then(b => console.warn('Formspree notification rejected:', res.status, b)).catch(() => console.warn('Formspree notification rejected:', res.status));
    }).catch(err => console.warn('Formspree notification failed:', err));
  }

  // Instant WhatsApp to you alongside the existing email notification — a
  // no-op until WhatsApp credentials are configured (see notify-whatsapp).
  function notifyByWhatsApp(table, record) {
    if (!sb) return;
    sb.functions.invoke('notify-whatsapp', { body: { table, record } }).catch(() => {});
  }

  // Push a new row straight to the CRM from the browser (best-effort, never
  // blocks or fails the caller). Stands in for a database webhook — some
  // projects don't have the internal schema Database Webhooks depends on.
  function syncToCrm(table, record) {
    if (!sb) return;
    sb.functions.invoke('crm-sync', { body: { table, record } }).catch(() => {});
  }

  // Map a DB row to the exact object shape the design's render code expects.
  function rowToOpportunity(r) {
    return {
      id: r.slug,
      _uuid: r.id,
      name: r.name,
      location: r.location,
      country: r.country,
      lat: r.lat, lng: r.lng,
      image: r.image,
      assetType: r.asset_type,
      assetProfile: r.asset_profile,
      tenure: r.tenure,
      dealStatus: r.deal_status,
      price: r.price,
      priceLabel: r.price_label,
      grossYield: r.gross_yield,
      netYield: r.net_yield,
      entryPsf: r.entry_psf,
      shortAngle: r.short_angle,
      summary: r.summary,
      metrics: r.metrics || {},
      highlights: r.highlights || [],
      gallery: r.gallery || [],
      unitSchedule: r.unit_schedule || [],
      featured: r.featured,
      order: r.sort_order,
      createdAt: r.created_at
    };
  }

  window.LS_API = API;
})();
