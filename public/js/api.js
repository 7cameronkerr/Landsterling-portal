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

    async signIn(email, password) {
      assertReady();
      return sb.auth.signInWithPassword({ email, password });
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

    // Combined activation: set password AND record the signed NDA in one step.
    async activateAccount({ password, ndaName, ndaVersion }) {
      assertReady();
      const { error: pErr } = await sb.auth.updateUser({ password });
      if (pErr) return { error: pErr };
      let ip = null;
      try { const r = await fetch('https://api.ipify.org?format=json'); ip = (await r.json()).ip; } catch (e) {}
      const { data: { user } } = await sb.auth.getUser();
      const { error: uErr } = await sb.from('profiles').update({
        nda_signed_at: new Date().toISOString(),
        nda_name:      ndaName,
        nda_version:   ndaVersion,
        nda_ip:        ip
      }).eq('id', user.id);
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

    /* ---- ENQUIRIES --------------------------------------------------- */

    async submitEnquiry(payload) {
      assertReady();
      // 1. Save to the database (your admin inbox)
      const { error } = await sb.from('enquiries').insert([payload]);
      // 2. Also email you via Formspree, if configured (best-effort)
      if (cfg.FORMSPREE_ENDPOINT) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v ?? ''));
        fetch(cfg.FORMSPREE_ENDPOINT, {
          method: 'POST', headers: { Accept: 'application/json' }, body: fd
        }).catch(() => {});
      }
      if (error) throw error;
      return true;
    }
  };

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
      featured: r.featured,
      order: r.sort_order
    };
  }

  window.LS_API = API;
})();
