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



/**
 * @param {string} path - e.g. "/api/users/users" (leading slash optional)
 * @param {{ method?: string, body?: object, headers?: Record<string, string> }} options
 * @returns {Promise<{ ok: boolean, status: number, data: object }>}
 */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function success(data) {
  return { ok: true, status: 200, data };
}

function failure(message) {
  return { ok: false, status: 400, data: { error: message } };
}

export async function apiRequest(path, options = {}) {
  await delay(250);

  if (!path) {
    return failure('Missing request path.');
  }

  return success({
    path,
    method: options.method || 'GET',
    placeholder: true,
  });
}

export const authApi = {
  login: async (email, password) => {
    await delay(450);

    if (!String(email || '').trim() || !String(password || '').trim()) {
      return failure('Email and password are required.');
    }

    return success({
      username: String(email).trim().toLowerCase().split('@')[0] || 'admin',
      email: String(email).trim().toLowerCase(),
      token: 'mock-token',
    });
  },
  signup: async (payload) => {
    await delay(450);

    if (!payload || !payload.email || !payload.password || !payload.username) {
      return failure('Username, email, and password are required.');
    }

    return success({
      created: true,
      user: {
        username: payload.username,
        email: String(payload.email).trim().toLowerCase(),
      },
    });
  },
};
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
