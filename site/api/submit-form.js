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
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  var now = Date.now();
  var record = rateLimitStore.get(ip);

  if (!record || now - record.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { start: now, count: 1 });
    return false;
  }

  record.count += 1;
  if (record.count > RATE_LIMIT_MAX) {
    return true;
  }

  return false;
}

function jsonResponse(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  var chunks = [];
  for await (var chunk of req) {
    chunks.push(chunk);
  }
  var raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

async function verifyRecaptcha(secret, token, remoteip) {
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

  return response.json();
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
  if (codes.indexOf('bad-request') !== -1) {
    return 'Captcha request was invalid. Please try again.';
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

module.exports = async function handler(req, res) {
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

  try {
    var web3formsResponse = await fetch(WEB3FORMS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(web3formsPayload)
    });

    var web3formsData = await web3formsResponse.json();
    jsonResponse(res, web3formsResponse.ok ? 200 : 502, web3formsData);
  } catch (error) {
    jsonResponse(res, 502, {
      success: false,
      message: 'Could not send the form. Please try again.'
    });
  }
}
