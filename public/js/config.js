/* ============================================================================
 *  LAND STERLING PORTAL — CONFIGURATION
 *  Paste your live values below (see SETUP.md). The Supabase keys are SAFE to
 *  expose in the browser — your data is protected by the Row Level Security
 *  rules in schema.sql. Never put the service_role key here.
 * ========================================================================== */
window.LS_CONFIG = {
  /* --- Supabase (SETUP.md Step 4) ------------------------------------- */
  SUPABASE_URL:      'https://psgasvgzhdgojuyykxyd.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_VnfBSBu-FGxP1Kz3486B8g_AT_6qj5o',

  /* --- Enquiry email (Formspree, SETUP.md Step 8) --------------------- */
  FORMSPREE_ENDPOINT: 'https://formspree.io/f/mwlkywyp',

  /* --- WhatsApp (top-bar button) -------------------------------------- */
  // International format without + or spaces. The message is pre-filled for the client.
  WHATSAPP: {
    number:  '971509005736',
    message: 'Hello Cameron, I am enquiring via the Land Sterling Investment Portal.'
  },

  /* --- Book a Call (Calendly) ----------------------------------------- */
  // Paste your Calendly scheduling link. Until then the button shows a notice.
  CALENDLY_URL: 'https://calendly.com/cameron-k-landsterling/investment-portal-call',

  /* --- Multi-currency display ----------------------------------------- */
  // Indicative FX used only to display the AED guide price in other currencies.
  // Update periodically; shown with an "indicative" note.
  CURRENCIES: {
    AED: { symbol: 'AED', rate: 1 },
    USD: { symbol: '$',   rate: 0.2723 },
    GBP: { symbol: '£',   rate: 0.215  },
    EUR: { symbol: '€',   rate: 0.252  }
  },

  /* --- Analytics (optional) ------------------------------------------- */
  // Add a Plausible domain OR a GA4 Measurement ID to enable analytics.
  ANALYTICS: {
    plausibleDomain: '',            // e.g. 'invest.landsterling.com'
    ga4MeasurementId: ''            // e.g. 'G-XXXXXXXXXX'
  },

  /* --- Company / legal (shown in footer & legal pages) ---------------- */
  COMPANY: {
    legalName:    'Land Sterling Properties LLC',
    tradeLicence: '669075',
    address:      'First Floor, Block B, Dubai Silicon Oasis HQ Building, Dubai, UAE',
    phone:        '+971 50 900 5736',
    email:        'Cameron.k@landsterling.com'
  },

  SUPPORT_EMAIL: 'Cameron.k@landsterling.com'
};
