(function () {
  var config = window.KEI22_FORM_CONFIG || {};
  var accessKey = config.web3formsAccessKey || '';

  function showSuccess(form) {
    var box = form.querySelector('.js-successbox');
    if (box) {
      box.style.display = 'block';
      if (config.successMessage) {
        box.textContent = config.successMessage;
      }
    }
    form.reset();
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

    if (!accessKey) {
      showError(
        form,
        config.missingConfigMessage ||
          'The form is not configured yet. Please write to us on WhatsApp or email.'
      );
      return;
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
      access_key: accessKey,
      name: getFieldValue(form, ['Name', 'name']),
      email: email,
      phone: phone,
      message: getFieldValue(form, ['Textarea', 'Message', 'message']),
      subject: config.formSubject || 'New inquiry from kei22.com',
      from_name: config.fromName || 'kei22.com',
      page_url: window.location.href,
      form_id: form.id || form.getAttribute('name') || 'contact'
    };

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data.success) {
          showSuccess(form);
          return;
        }
        showError(form, data.message || 'Could not send the form. Please try again.');
      })
      .catch(function () {
        showError(
          form,
          'Network error. Please try again or write to us on WhatsApp.'
        );
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
