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
    const close = (choice) => { localStorage.setItem('ls_cookie_consent', choice); bar.remove(); if (choice === 'accepted') loadAnalytics(); };
    document.getElementById('ls-cc-accept').onclick  = () => close('accepted');
    document.getElementById('ls-cc-decline').onclick = () => close('declined');
  }

  /* ---- 2. BOOK A CALL (Calendly) ------------------------------------- */
  window.openBookACall = function () {
    let overlay = document.getElementById('ls-calendly-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ls-calendly-overlay';
      overlay.innerHTML =
        '<div class="ls-cal-modal">' +
          '<button class="ls-cal-close" aria-label="Close">&#10005;</button>' +
          '<div class="ls-cal-body"></div>' +
        '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
      overlay.querySelector('.ls-cal-close').onclick = () => overlay.classList.remove('open');
    }
    const body = overlay.querySelector('.ls-cal-body');
    if (cfg.CALENDLY_URL) {
      body.innerHTML = '<iframe src="' + cfg.CALENDLY_URL + '" title="Book a call" loading="lazy"></iframe>';
    } else {
      const email = cfg.SUPPORT_EMAIL || 'the team';
      body.innerHTML = '<div class="ls-cal-fallback"><h3>Arrange a Call</h3>' +
        '<p>Scheduling is being finalised. In the meantime, please email ' +
        '<a href="mailto:' + email + '">' + email + '</a> and we will arrange a time.</p></div>';
    }
    overlay.classList.add('open');
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
    '#ls-calendly-overlay{position:fixed;inset:0;z-index:9500;background:rgba(26,31,46,.7);display:none;' +
      'align-items:center;justify-content:center;padding:24px;}' +
    '#ls-calendly-overlay.open{display:flex;}' +
    '.ls-cal-modal{background:#fff;width:100%;max-width:720px;height:80vh;max-height:760px;border-radius:4px;position:relative;overflow:hidden;}' +
    '.ls-cal-close{position:absolute;top:10px;right:12px;z-index:2;background:rgba(255,255,255,.9);border:none;border-radius:50%;' +
      'width:32px;height:32px;cursor:pointer;font-size:14px;}' +
    '.ls-cal-body,.ls-cal-body iframe{width:100%;height:100%;border:0;}' +
    '.ls-cal-fallback{padding:48px 36px;text-align:center;font-family:"DM Sans",sans-serif;}' +
    '.ls-cal-fallback h3{font-family:"Cormorant Garamond",serif;font-weight:300;font-size:1.5rem;margin-bottom:10px;}' +
    '.ls-cal-fallback a{color:#C0272D;}' +
    '@media(max-width:600px){.ls-cal-modal{height:88vh;}}';
  document.head.appendChild(css);

  document.addEventListener('DOMContentLoaded', renderConsentBanner);
  if (document.readyState !== 'loading') renderConsentBanner();
})();
