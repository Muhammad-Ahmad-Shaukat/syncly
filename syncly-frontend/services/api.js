import { getApiBase } from '../config/api';

const SENSITIVE_KEYS = new Set(['password', 'oldPassword', 'newPassword', 'access_token', 'access_token_secret']);

function redactForLog(value) {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item));
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '***';
    } else if (v && typeof v === 'object') {
      out[k] = redactForLog(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function logApi(label, payload) {
  if (__DEV__) {
    console.log(`[api] ${label}`, payload);
  }
}

function logApiError(label, payload) {
  console.warn(`[api] ${label}`, payload);
}

/**
 * @param {string} path - e.g. "/api/users/users" (leading slash optional)
 * @param {{ method?: string, body?: object, headers?: Record<string, string> }} options
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const base = getApiBase();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${normalized}`;

  logApi('request', {
    method,
    url,
    body: body !== undefined ? redactForLog(body) : undefined,
  });

  const init = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text || 'Invalid response' };
      }
    }

    logApi('response', { method, url, status: res.status, ok: res.ok });

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const message = err?.message || 'Network request failed';
    logApiError('network', { method, url, message });
    return {
      ok: false,
      status: 0,
      data: { error: message },
    };
  }
}

export const authApi = {
  login: (email, password) =>
    apiRequest('/api/users/login', {
      method: 'POST',
      body: { email, password },
    }),
  signup: (payload) =>
    apiRequest('/api/users/users', {
      method: 'POST',
      body: payload,
    }),
};
