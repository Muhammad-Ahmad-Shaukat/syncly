const base = () => (process.env.SYNCLY_API_URL || "http://localhost:3000").replace(/\/$/, "");

/**
 * @param {string} method
 * @param {string} path e.g. /api/connectors/shopify/auth/exchange
 * @param {object|null} body
 * @param {string} [bearer]
 */
export async function synclyBackendFetch(method, path, body = null, bearer = null) {
    const url = `${base()}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = { Accept: "application/json" };
    if (body != null) {
        headers["Content-Type"] = "application/json";
    }
    if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
    }
    const res = await fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = { success: false, error: text?.slice(0, 200) || "Invalid JSON" };
    }
    return { ok: res.ok, status: res.status, json };
}
