import { getApiBase } from '../config/api';

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
  return { ok: res.ok, status: res.status, data };
}

export const authApi = {
  login: (email, password) =>
    apiRequest('/api/users/users/login', {
      method: 'POST',
      body: { email, password },
    }),
  signup: (payload) =>
    apiRequest('/api/users/users', {
      method: 'POST',
      body: payload,
    }),
};
