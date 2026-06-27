(function () {
  var config = window.KEI22_FORM_CONFIG || {};
  var tracking = window.KEI22_TRACKING || {};
  var recaptchaSiteKey = config.recaptchaSiteKey || '';
  var submitEndpoint = config.submitEndpoint || '/api/submit-form';
  var minFillTimeMs = config.minFillTimeMs || 3000;
  var recaptchaLoadQueue = [];
  var recaptchaScriptRequested = false;

  function trackLeadConversion() {
    var sendTo =
      tracking.googleAdsConversionSendTo || 'AW-18216688626/grFaCMmgrrwcEPK3su5D';

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', { send_to: sendTo });
    }
  }

  function resetRecaptcha(form) {
    var widgetId = form.getAttribute('data-recaptcha-widget-id');
    if (widgetId && typeof window.grecaptcha !== 'undefined') {
      window.grecaptcha.reset(parseInt(widgetId, 10));
    }
  }

  function showSuccess(form) {
    var box = form.querySelector('.js-successbox');
    if (box) {
      box.style.display = 'block';
      if (config.successMessage) {
        box.textContent = config.successMessage;
      }
    }
    form.reset();
    resetRecaptcha(form);
    trackLeadConversion();
  }

  function hideErrors(form) {
    var boxes = form.querySelectorAll('.js-errorbox-all');
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].style.display = 'none';
    }
  }

  function showError(form, message) {
    var box = form.querySelector('.js-errorbox-all');
    if (!box) {
      alert(message);
      return;
    }
    box.style.display = 'block';
    var item = box.querySelector('.js-rule-error-all');
    if (item) {
      item.textContent = message;
    }
  }

  function getFieldValue(form, names) {
    for (var i = 0; i < names.length; i++) {
      var field = form.querySelector('[name="' + names[i] + '"]');
      if (field && field.value) {
        return field.value.trim();
      }
    }
    return '';
  }

  function getField(form, names) {
    for (var i = 0; i < names.length; i++) {
      var field = form.querySelector('[name="' + names[i] + '"]');
      if (field) {
        return field;
      }
    }
    return null;
  }

  function setRequiredFields(form) {
    var fields = [
      getField(form, ['Name', 'name']),
      getField(form, ['Phone', 'phone']),
      getField(form, ['Email', 'email']),
      getField(form, ['Textarea', 'Message', 'message'])
    ];

    for (var i = 0; i < fields.length; i++) {
      if (fields[i]) {
        fields[i].required = true;
        fields[i].setAttribute('aria-required', 'true');
        fields[i].setAttribute('data-tilda-req', '1');
      }
    }
  }

  function ensureHoneypotFields(form) {
    if (!form.querySelector('[name="botcheck"]')) {
      var botcheck = document.createElement('input');
      botcheck.type = 'checkbox';
      botcheck.name = 'botcheck';
      botcheck.className = 'kei22-hp';
      botcheck.tabIndex = -1;
      botcheck.setAttribute('autocomplete', 'off');
      botcheck.setAttribute('aria-hidden', 'true');
      form.appendChild(botcheck);
    }

    if (!form.querySelector('[name="website"]')) {
      var decoy = document.createElement('input');
      decoy.type = 'text';
      decoy.name = 'website';
      decoy.className = 'kei22-hp';
      decoy.tabIndex = -1;
      decoy.setAttribute('autocomplete', 'off');
      decoy.setAttribute('aria-hidden', 'true');
      form.appendChild(decoy);
    }
  }

  function isHoneypotTriggered(form) {
    var botcheck = form.querySelector('[name="botcheck"]');
    if (botcheck && botcheck.checked) {
      return true;
    }

    var decoy = form.querySelector('[name="website"]');
    if (decoy && decoy.value.trim()) {
      return true;
    }

    var loadedAt = parseInt(form.getAttribute('data-kei22-loaded-at') || '0', 10);
    if (loadedAt && Date.now() - loadedAt < minFillTimeMs) {
      return true;
    }

    return false;
  }

  function flushRecaptchaQueue() {
    while (recaptchaLoadQueue.length) {
      recaptchaLoadQueue.shift()();
    }
  }

  window.kei22RecaptchaOnLoad = function () {
    flushRecaptchaQueue();
  };

  function whenRecaptchaReady(callback) {
    if (typeof window.grecaptcha !== 'undefined') {
      window.grecaptcha.ready(callback);
      return;
    }

    recaptchaLoadQueue.push(callback);

    if (recaptchaScriptRequested) {
      return;
    }

    recaptchaScriptRequested = true;
    var script = document.createElement('script');
    script.src =
      'https://www.google.com/recaptcha/api.js?onload=kei22RecaptchaOnLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  function ensureRecaptcha(form) {
    if (!recaptchaSiteKey) {
      return;
    }

    var submitWrap = form.querySelector('.t-form__submit');
    if (!submitWrap) {
      return;
    }

    var container = form.querySelector('[data-recaptcha]');
    if (!container) {
      container = document.createElement('div');
      container.className = 'kei22-recaptcha';
      container.setAttribute('data-recaptcha', '');
      submitWrap.parentNode.insertBefore(container, submitWrap);
    }

    if (form.getAttribute('data-recaptcha-widget-id')) {
      return;
    }

    container.id = 'kei22-recaptcha-' + (form.id || form.getAttribute('name') || 'contact');

    whenRecaptchaReady(function () {
      if (form.getAttribute('data-recaptcha-widget-id')) {
        return;
      }

      var widgetId = window.grecaptcha.render(container.id, {
        sitekey: recaptchaSiteKey
      });
      form.setAttribute('data-recaptcha-widget-id', String(widgetId));
    });
  }

  function getRecaptchaResponse(form) {
    var widgetId = form.getAttribute('data-recaptcha-widget-id');
    if (!widgetId || typeof window.grecaptcha === 'undefined') {
      return '';
    }
    return window.grecaptcha.getResponse(parseInt(widgetId, 10)) || '';
  }

  function isPhoneComplete(phone) {
    return phone.replace(/\D/g, '').length >= 11;
  }

  function validateRequiredFields(form) {
    var name = getFieldValue(form, ['Name', 'name']);
    var phone = getFieldValue(form, ['Phone', 'phone']);
    var emailField = getField(form, ['Email', 'email']);
    var email = getFieldValue(form, ['Email', 'email']);
    var message = getFieldValue(form, ['Textarea', 'Message', 'message']);

    if (!name || !phone || !email || !message) {
      showError(form, config.validationMessage || 'Please fill in all required fields.');
      return false;
    }

    if (!isPhoneComplete(phone)) {
      showError(form, config.phoneValidationMessage || 'Please enter a full phone number.');
      return false;
    }

    if (emailField && !emailField.validity.valid) {
      showError(form, config.emailValidationMessage || 'Please enter a valid email address.');
      return false;
    }

    return true;
  }

  function setDefaultPhoneCountry() {
    var records = document.querySelectorAll('#allrecords');
    for (var i = 0; i < records.length; i++) {
      records[i].setAttribute('data-tilda-project-country', 'US');
    }

    var phones = document.querySelectorAll('form[data-kei22-form] .js-phonemask-input');
    for (var j = 0; j < phones.length; j++) {
      phones[j].setAttribute('data-phonemask-maskcountry', 'US');
      phones[j].setAttribute('placeholder', '+1 (000) 000-0000');
    }

    if (typeof window.t_form_phonemask_load === 'function') {
      for (var k = 0; k < phones.length; k++) {
        phones[k].setAttribute('data-phonemask-init', 'no');
        window.t_form_phonemask_load(phones[k]);
      }
    }
  }

  function sendForm(form) {
    hideErrors(form);

    if (!validateRequiredFields(form)) {
      return;
    }

    if (isHoneypotTriggered(form)) {
      showSuccess(form);
      return;
    }

    if (recaptchaSiteKey) {
      var captchaToken = getRecaptchaResponse(form);
      if (!captchaToken) {
        showError(
          form,
          config.captchaRequiredMessage || 'Please confirm you are not a robot.'
        );
        return;
      }
    }

    var email = getFieldValue(form, ['Email', 'email']);
    var phone = getFieldValue(form, ['Phone', 'phone']);

    var submitBtn = form.querySelector('button[type="submit"]');
    var submitTextEl = submitBtn ? submitBtn.querySelector('.t-btnflex__text') : null;
    var submitText = submitTextEl
      ? submitTextEl.textContent
      : submitBtn
        ? submitBtn.textContent.trim()
        : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      if (config.sendingText) {
        if (submitTextEl) {
          submitTextEl.textContent = config.sendingText;
        } else {
          submitBtn.textContent = config.sendingText;
        }
      }
    }

    var payload = {
      name: getFieldValue(form, ['Name', 'name']),
      email: email,
      phone: phone,
      message: getFieldValue(form, ['Textarea', 'Message', 'message']),
      subject: config.formSubject || 'New inquiry from kei22.com',
      from_name: config.fromName || 'kei22.com',
      page_url: window.location.href,
      form_id: form.id || form.getAttribute('name') || 'contact',
      website: getFieldValue(form, ['website']),
      botcheck: !!(form.querySelector('[name="botcheck"]') || {}).checked
    };

    if (recaptchaSiteKey) {
      payload['g-recaptcha-response'] = getRecaptchaResponse(form);
    }

    fetch(submitEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.data.success) {
          showSuccess(form);
          return;
        }
        showError(form, result.data.message || 'Could not send the form. Please try again.');
        resetRecaptcha(form);
      })
      .catch(function () {
        showError(
          form,
          'Network error. Please try again or write to us on WhatsApp.'
        );
        resetRecaptcha(form);
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          if (submitTextEl) {
            submitTextEl.textContent = submitText;
          } else {
            submitBtn.textContent = submitText;
          }
        }
      });
  }

  function initForm(form) {
    form.setAttribute('data-kei22-loaded-at', String(Date.now()));
    ensureHoneypotFields(form);
    ensureRecaptcha(form);
    setRequiredFields(form);

    form.addEventListener(
      'submit',
      function (event) {
        event.preventDefault();
        event.stopPropagation();
        sendForm(form);
      },
      true
    );
  }

  function init() {
    setDefaultPhoneCountry();
    window.setTimeout(setDefaultPhoneCountry, 300);
    window.setTimeout(setDefaultPhoneCountry, 1000);

    var forms = document.querySelectorAll('form[data-kei22-form]');
    for (var i = 0; i < forms.length; i++) {
      initForm(forms[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
