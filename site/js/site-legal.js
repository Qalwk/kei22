(function () {
  var legal = window.KEI22_LEGAL || {};
  var storageKey = 'kei22_cookie_consent';

  function isCatalogPage() {
    return /international-real-estate/.test(window.location.pathname);
  }

  function createLegalFooter() {
    if (document.getElementById('kei22-legal-footer')) {
      return;
    }

    var container = document.getElementById('allrecords') || document.body;
    var footer = document.createElement('div');
    footer.id = 'kei22-legal-footer';
    footer.className = 'kei22-legal-footer' + (isCatalogPage() ? ' kei22-legal-footer--dark' : '');
    footer.innerHTML =
      '<div class="kei22-legal-footer__inner">' +
      '<div class="kei22-legal-footer__business">' +
      '<p class="kei22-legal-footer__name">' +
      escapeHtml(legal.businessName || 'IE Budanova Ekaterina') +
      '</p>' +
      '<p>Identification No.: ' +
      escapeHtml(legal.identificationNo || '345791218') +
      '</p>' +
      '<p>' +
      escapeHtml(
        legal.address || 'Georgia, Batumi, Giorgi Leonidze Street No. 4, Apartment 75'
      ) +
      '</p>' +
      '<p>' +
      escapeHtml(
        legal.businessDescription ||
          'International real estate brokerage and consultation services. Property listings on this website are provided for informational purposes only.'
      ) +
      '</p>' +
      '</div>' +
      '<nav class="kei22-legal-footer__links" aria-label="Legal">' +
      '<a href="/privacy-policy">Privacy Policy</a>' +
      '</nav>' +
      '<p class="kei22-legal-footer__copy">&copy; ' +
      new Date().getFullYear() +
      ' ' +
      escapeHtml(legal.businessName || 'IE Budanova Ekaterina') +
      '. All rights reserved.</p>' +
      '</div>';

    container.appendChild(footer);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function createCookieBanner() {
    if (document.getElementById('kei22-cookie-consent')) {
      return;
    }

    var banner = document.createElement('div');
    banner.id = 'kei22-cookie-consent';
    banner.className = 'kei22-cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie notice');
    banner.hidden = true;
    banner.innerHTML =
      '<div class="kei22-cookie-consent__inner">' +
      '<p class="kei22-cookie-consent__text">' +
      'We use cookies and similar technologies to analyze traffic, improve our services, and support advertising. ' +
      'By clicking "Accept", you consent to our use of cookies. ' +
      '<a href="/privacy-policy">Read our Privacy Policy</a>.' +
      '</p>' +
      '<div class="kei22-cookie-consent__actions">' +
      '<button type="button" class="kei22-cookie-consent__btn kei22-cookie-consent__btn--accept" data-cookie-accept>Accept</button>' +
      '<button type="button" class="kei22-cookie-consent__btn kei22-cookie-consent__btn--decline" data-cookie-decline>Decline</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(banner);

    var acceptBtn = banner.querySelector('[data-cookie-accept]');
    var declineBtn = banner.querySelector('[data-cookie-decline]');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        storeConsent('accepted');
        hideCookieBanner();
      });
    }

    if (declineBtn) {
      declineBtn.addEventListener('click', function () {
        storeConsent('declined');
        hideCookieBanner();
      });
    }
  }

  function storeConsent(value) {
    try {
      localStorage.setItem(storageKey, value);
    } catch (error) {
      /* ignore storage errors */
    }
  }

  function getConsent() {
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function showCookieBanner() {
    var banner = document.getElementById('kei22-cookie-consent');
    if (banner) {
      banner.hidden = false;
    }
  }

  function hideCookieBanner() {
    var banner = document.getElementById('kei22-cookie-consent');
    if (banner) {
      banner.hidden = true;
    }
  }

  function initCookieConsent() {
    createCookieBanner();
    if (!getConsent()) {
      showCookieBanner();
    }
  }

  function init() {
    createLegalFooter();
    initCookieConsent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
