const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

const rateLimitStore = new Map();

function getClientIp(req) {
  var forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  if (req.headers['x-real-ip']) {
    return String(req.headers['x-real-ip']);
  }
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return 'unknown';
}

function isRateLimited(ip) {
  var now = Date.now();
  var record = rateLimitStore.get(ip);

  if (!record || now - record.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { start: now, count: 1 });
    return false;
  }

  record.count += 1;
  return record.count > RATE_LIMIT_MAX;
}

function jsonResponse(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      if (!req.body.trim()) {
        return Promise.resolve({});
      }
      return Promise.resolve(JSON.parse(req.body));
    }
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return Promise.resolve(req.body);
    }
  }

  return new Promise(function (resolve, reject) {
    var data = '';

    req.on('data', function (chunk) {
      data += chunk;
    });

    req.on('end', function () {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

async function verifyRecaptcha(secret, token, remoteip) {
  try {
    var params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', token);
    if (remoteip) {
      params.set('remoteip', remoteip);
    }

    var response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      return { success: false, 'error-codes': ['bad-request'] };
    }

    return await response.json();
  } catch (error) {
    console.error('recaptcha verify failed:', error);
    return { success: false, 'error-codes': ['bad-request'] };
  }
}

function captchaErrorMessage(result) {
  var codes = result && result['error-codes'] ? result['error-codes'] : [];

  if (codes.indexOf('invalid-input-secret') !== -1) {
    return 'Server captcha secret is invalid. Check RECAPTCHA_SECRET_KEY in Vercel.';
  }
  if (codes.indexOf('invalid-input-response') !== -1) {
    return 'Captcha expired. Please check the box again and resubmit.';
  }
  if (codes.indexOf('timeout-or-duplicate') !== -1) {
    return 'Captcha was already used. Please check the box again and resubmit.';
  }

  return 'Captcha verification failed. Please try again.';
}

function isHoneypotTriggered(body) {
  if (body.botcheck) {
    return true;
  }
  if (body.website && String(body.website).trim()) {
    return true;
  }
  return false;
}

async function handleSubmit(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    jsonResponse(res, 405, { success: false, message: 'Method not allowed.' });
    return;
  }

  var accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    jsonResponse(res, 503, {
      success: false,
      message: 'Form delivery is not configured yet. Please contact us directly.'
    });
    return;
  }

  var clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    jsonResponse(res, 429, {
      success: false,
      message: 'Too many requests. Please try again later.'
    });
    return;
  }

  var body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    jsonResponse(res, 400, { success: false, message: 'Invalid request body.' });
    return;
  }

  if (isHoneypotTriggered(body)) {
    jsonResponse(res, 200, { success: true });
    return;
  }

  var recaptchaSecret = (process.env.RECAPTCHA_SECRET_KEY || '').trim();
  if (recaptchaSecret) {
    var captchaToken = String(body['g-recaptcha-response'] || '').trim();
    if (!captchaToken) {
      jsonResponse(res, 400, {
        success: false,
        message: 'Please confirm you are not a robot.'
      });
      return;
    }

    var captchaResult = await verifyRecaptcha(recaptchaSecret, captchaToken, clientIp);
    if (!captchaResult.success) {
      jsonResponse(res, 400, {
        success: false,
        message: captchaErrorMessage(captchaResult)
      });
      return;
    }
  }

  var name = String(body.name || '').trim();
  var email = String(body.email || '').trim();
  var phone = String(body.phone || '').trim();
  var message = String(body.message || '').trim();

  if (!name || !email || !phone || !message) {
    jsonResponse(res, 400, {
      success: false,
      message: 'Please fill in all required fields.'
    });
    return;
  }

  var web3formsPayload = {
    access_key: accessKey,
    name: name,
    email: email,
    phone: phone,
    message: message,
    subject: body.subject || 'New inquiry from kei22.com',
    from_name: body.from_name || 'kei22.com',
    page_url: body.page_url || '',
    form_id: body.form_id || 'contact',
    botcheck: false
  };

  var web3formsResponse = await fetch(WEB3FORMS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(web3formsPayload)
  });

  var web3formsText = await web3formsResponse.text();
  var web3formsData = {};

  if (web3formsText) {
    try {
      web3formsData = JSON.parse(web3formsText);
    } catch (error) {
      console.error('web3forms invalid json:', web3formsText.slice(0, 200));
      jsonResponse(res, 502, {
        success: false,
        message: 'Could not send the form. Please try again.'
      });
      return;
    }
  }

  jsonResponse(res, web3formsResponse.ok ? 200 : 502, web3formsData);
}

module.exports = async function handler(req, res) {
  try {
    await handleSubmit(req, res);
  } catch (error) {
    console.error('submit-form crashed:', error);
    jsonResponse(res, 500, {
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};
