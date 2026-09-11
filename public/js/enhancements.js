/* ============================================================================
 *  LAND STERLING PORTAL — SHARED ENHANCEMENTS
 *  Cookie consent (privacy-first) · consent-gated analytics · Book a Call.
 *  Safe to include on any page. Requires config.js loaded first.
 * ========================================================================== */
(function () {
  const cfg = window.LS_CONFIG || {};

  /* ---- 1. COOKIE CONSENT (analytics stays off until accepted) -------- */
  function consentState() { return localStorage.getItem('ls_cookie_consent'); }

  function loadAnalytics() {
    const a = cfg.ANALYTICS || {};
    if (a.plausibleDomain) {
      const s = document.createElement('script');
      s.defer = true; s.dataset.domain = a.plausibleDomain;
      s.src = 'https://plausible.io/js/script.js';
      document.head.appendChild(s);
    }
    if (a.ga4MeasurementId) {
      const g = document.createElement('script');
      g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + a.ga4MeasurementId;
      document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', a.ga4MeasurementId, { anonymize_ip: true });
    }
  }

  function renderConsentBanner() {
    if (consentState()) { if (consentState() === 'accepted') loadAnalytics(); return; }
    const bar = document.createElement('div');
    bar.id = 'ls-cookie-bar';
    bar.innerHTML =
      '<div class="ls-cc-inner">' +
        '<p>We use essential cookies to run this portal, and analytics cookies (only with your consent) to understand engagement. ' +
        'See our <a href="privacy.html">Privacy Policy</a>.</p>' +
        '<div class="ls-cc-actions">' +
          '<button id="ls-cc-decline">Decline</button>' +
          '<button id="ls-cc-accept">Accept</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bar);
    const close = (choice) => {
      localStorage.setItem('ls_cookie_consent', choice); bar.remove();
      if (choice === 'accepted') loadAnalytics();
      document.dispatchEvent(new CustomEvent('ls-consent'));   // lets the deal-page action bar appear
    };
    document.getElementById('ls-cc-accept').onclick  = () => close('accepted');
    document.getElementById('ls-cc-decline').onclick = () => close('declined');
  }

  /* ---- 2. BOOK A CALL (Calendly) ------------------------------------- */
  function closeBookACall() {
    const overlay = document.getElementById('ls-calendly-overlay');
    if (overlay) overlay.classList.remove('open');
    document.documentElement.style.overflow = '';
  }
  window.closeBookACall = closeBookACall;

  window.openBookACall = function () {
    let overlay = document.getElementById('ls-calendly-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ls-calendly-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Book a call');
      overlay.innerHTML =
        '<div class="ls-cal-modal">' +
          '<div class="ls-cal-head">' +
            '<div><div class="ls-cal-eyebrow">Land Sterling</div>' +
            '<h3>Book a call with Cameron Kerr</h3>' +
            '<div class="ls-cal-role">Associate Director, Investment Advisory</div></div>' +
            '<button class="ls-cal-close" aria-label="Close">&#10005;</button>' +
          '</div>' +
          '<div class="ls-cal-body"></div>' +
        '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) closeBookACall(); });
      overlay.querySelector('.ls-cal-close').onclick = closeBookACall;
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) { e.stopPropagation(); closeBookACall(); }
      }, true);
    }
    const body = overlay.querySelector('.ls-cal-body');
    if (cfg.CALENDLY_URL) {
      // Brand the embed and prefill a signed-in investor's name/email.
      const p = window.LS_PROFILE;
      const name = p ? (p.full_name || ((p.first_name || '') + ' ' + (p.last_name || '')).trim()) : '';
      const params = 'hide_gdpr_banner=1&primary_color=C0272D&background_color=F7F5F1&text_color=1A1F2E' +
        (name ? '&name=' + encodeURIComponent(name) : '') +
        (p && p.email ? '&email=' + encodeURIComponent(p.email) : '');
      const url = cfg.CALENDLY_URL + (cfg.CALENDLY_URL.includes('?') ? '&' : '?') + params;
      body.innerHTML = '<div class="ls-cal-loading">Loading calendar…</div>' +
        '<iframe src="' + url + '" title="Book a call" loading="lazy"></iframe>';
      body.querySelector('iframe').addEventListener('load', () => {
        const l = body.querySelector('.ls-cal-loading'); if (l) l.remove();
      });
    } else {
      // No scheduling link yet: offer the direct channels instead of an apology.
      const phone = (cfg.COMPANY && cfg.COMPANY.phone) || '';
      const wa = (cfg.WHATSAPP && cfg.WHATSAPP.number)
        ? 'https://wa.me/' + String(cfg.WHATSAPP.number).replace(/\D/g, '') +
          (cfg.WHATSAPP.message ? '?text=' + encodeURIComponent(cfg.WHATSAPP.message) : '')
        : '';
      body.innerHTML = '<div class="ls-cal-fallback">' +
        '<p>Choose how you would like to speak with us.</p>' +
        (phone ? '<a class="ls-cal-btn" href="tel:' + phone.replace(/\s/g, '') + '">Call ' + phone + '</a>' : '') +
        (wa ? '<a class="ls-cal-btn" href="' + wa + '" target="_blank" rel="noopener">Message on WhatsApp</a>' : '') +
        '<button type="button" class="ls-cal-btn ls-cal-btn-primary" id="ls-cal-callback">Request a call-back</button>' +
        '</div>';
      body.querySelector('#ls-cal-callback').onclick = () => {
        closeBookACall();
        if (typeof openEnquireModal === 'function') {
          openEnquireModal(null);
          const tag = document.getElementById('enquireOppTag');
          if (tag) tag.textContent = 'Call-back request';
          window.LS_ENQ_TYPE = 'callback';
        }
      };
    }
    overlay.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
  };

  /* ---- 3. STYLES ----------------------------------------------------- */
  const css = document.createElement('style');
  css.textContent =
    '#ls-cookie-bar{position:fixed;left:0;right:0;bottom:0;z-index:9000;background:#1A1F2E;color:#fff;' +
      'box-shadow:0 -2px 20px rgba(0,0,0,.25);}' +
    '#ls-cookie-bar .ls-cc-inner{max-width:1100px;margin:0 auto;padding:14px 24px;display:flex;gap:18px;' +
      'align-items:center;justify-content:space-between;flex-wrap:wrap;}' +
    '#ls-cookie-bar p{font:400 12.5px/1.6 "DM Sans",system-ui,sans-serif;color:rgba(255,255,255,.8);margin:0;flex:1;min-width:240px;}' +
    '#ls-cookie-bar a{color:#fff;text-decoration:underline;}' +
    '#ls-cookie-bar .ls-cc-actions{display:flex;gap:10px;flex-shrink:0;}' +
    '#ls-cookie-bar button{font:500 11px/1 "DM Sans",sans-serif;letter-spacing:.08em;text-transform:uppercase;' +
      'padding:11px 20px;border-radius:2px;cursor:pointer;border:1px solid rgba(255,255,255,.4);background:none;color:#fff;}' +
    '#ls-cookie-bar #ls-cc-accept{background:#C0272D;border-color:#C0272D;}' +
    '#ls-calendly-overlay{position:fixed;inset:0;z-index:10050;background:rgba(26,31,46,.72);display:none;' +
      'align-items:center;justify-content:center;padding:24px;}' +
    '#ls-calendly-overlay.open{display:flex;}' +
    '.ls-cal-modal{background:#F7F5F1;width:100%;max-width:720px;height:82vh;max-height:780px;border-radius:2px;' +
      'position:relative;overflow:hidden;display:flex;flex-direction:column;}' +
    '.ls-cal-head{background:#1A1F2E;color:#fff;padding:16px 20px;display:flex;align-items:flex-start;' +
      'justify-content:space-between;gap:12px;font-family:"DM Sans",system-ui,sans-serif;}' +
    '.ls-cal-eyebrow{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.62);}' +
    '.ls-cal-head h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:300;font-size:22px;line-height:1.15;margin:4px 0 2px;color:#fff;}' +
    '.ls-cal-role{font-size:11px;letter-spacing:.06em;color:rgba(255,255,255,.62);}' +
    '.ls-cal-close{flex-shrink:0;background:rgba(255,255,255,.12);color:#fff;border:none;border-radius:50%;' +
      'width:34px;height:34px;cursor:pointer;font-size:14px;}' +
    '.ls-cal-close:hover{background:#C0272D;}' +
    '.ls-cal-body{flex:1;position:relative;min-height:0;}' +
    '.ls-cal-body iframe{width:100%;height:100%;border:0;display:block;}' +
    '.ls-cal-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
      'font:400 12px "DM Sans",sans-serif;color:#6B6560;}' +
    '.ls-cal-fallback{padding:36px 28px;font-family:"DM Sans",sans-serif;display:flex;flex-direction:column;gap:10px;}' +
    '.ls-cal-fallback p{font-size:14px;color:#6B6560;margin:0 0 10px;text-align:center;}' +
    '.ls-cal-btn{display:block;text-align:center;padding:13px 18px;border:1px solid #1A1A1A;color:#1A1A1A;background:#fff;' +
      'border-radius:2px;font:500 12px "DM Sans",sans-serif;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;cursor:pointer;}' +
    '.ls-cal-btn:hover{background:#1A1A1A;color:#fff;}' +
    '.ls-cal-btn-primary{background:#C0272D;border-color:#C0272D;color:#fff;}' +
    '.ls-cal-btn-primary:hover{background:#a02025;border-color:#a02025;}' +
    '@media(max-width:600px){#ls-calendly-overlay{padding:0;}.ls-cal-modal{height:100vh;height:100dvh;max-height:none;border-radius:0;}}';
  document.head.appendChild(css);

  document.addEventListener('DOMContentLoaded', renderConsentBanner);
  if (document.readyState !== 'loading') renderConsentBanner();
})();
