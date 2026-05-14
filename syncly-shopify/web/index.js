// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import PrivacyWebhookHandlers from "./privacy.js";
import SynclyWebhooks from "./syncly-webhooks.js";
import { getConnectorForShop, saveConnectorForShop } from "./syncly-connector-store.js";
import { synclyBackendFetch } from "./syncly-backend-bridge.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "8787",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res, next) => {
    try {
      const session = res.locals.shopify?.session;
      if (session?.shop && session?.accessToken) {
        saveConnectorForShop(session.shop, {
          pending_shopify_access_token: session.accessToken
        });
        const conn = getConnectorForShop(session.shop);
        if (conn?.access_token) {
          const { ok, json } = await synclyBackendFetch(
            "POST",
            "/api/connectors/shopify/session",
            {
              shopify_access_token: session.accessToken,
              shop_domain: session.shop
            },
            conn.access_token
          );
          if (!ok) {
            console.error("[syncly] Failed to save Shopify Admin token to backend:", json);
          } else {
            saveConnectorForShop(session.shop, {
              pending_shopify_access_token: null
            });
          }
        }
      }
    } catch (e) {
      console.error("[syncly] OAuth callback hook:", e);
    }
    next();
  },
  shopify.redirectToShopifyOrAppRoot()
);

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({
    webhookHandlers: { ...PrivacyWebhookHandlers, ...SynclyWebhooks }
  })
);

app.use("/api/*", shopify.validateAuthenticatedSession());
app.use(express.json());

app.post("/api/syncly/exchange", async (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "email and password required" });
  }
  const { ok, json } = await synclyBackendFetch("POST", "/api/connectors/shopify/auth/exchange", {
    email: String(email).trim(),
    password: String(password),
    store_url: shop,
    store_name: shop
  });
  if (json?.success && json?.data) {
    saveConnectorForShop(shop, {
      store_id: json.data.store_id,
      access_token: json.data.access_token,
      refresh_token: json.data.refresh_token,
      access_expires_at: json.data.access_expires_at,
      webhook_secret: json.data.webhook_secret
    });
    const after = getConnectorForShop(shop);
    if (after?.pending_shopify_access_token && after?.access_token) {
      const { ok, json: sessJson } = await synclyBackendFetch(
        "POST",
        "/api/connectors/shopify/session",
        {
          shopify_access_token: after.pending_shopify_access_token,
          shop_domain: shop
        },
        after.access_token
      );
      if (!ok) {
        console.error("[syncly] Post-exchange session save failed:", sessJson);
      } else {
        saveConnectorForShop(shop, { pending_shopify_access_token: null });
      }
    }
  }
  return res.status(ok ? 200 : 401).json(json);
});

async function bridgeGet(req, res, backendPath) {
  const shop = res.locals.shopify.session.shop;
  const conn = getConnectorForShop(shop);
  if (!conn?.access_token) {
    return res.status(422).json({ success: false, error: "Connect your Syncly account first." });
  }
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const pathWithQs = `${backendPath}${qs}`;
  const { ok, json } = await synclyBackendFetch("GET", pathWithQs, null, conn.access_token);
  return res.status(ok ? 200 : json?.error ? 400 : 502).json(json);
}

async function bridgePost(req, res, backendPath, body) {
  const shop = res.locals.shopify.session.shop;
  const conn = getConnectorForShop(shop);
  if (!conn?.access_token) {
    return res.status(422).json({ success: false, error: "Connect your Syncly account first." });
  }
  const { ok, json } = await synclyBackendFetch("POST", backendPath, body, conn.access_token);
  return res.status(ok ? 200 : 400).json(json);
}

app.get("/api/bridge/syncly/me", (req, res) => bridgeGet(req, res, "/api/syncly/me"));
app.get("/api/bridge/syncly/sync/runs", (req, res) => bridgeGet(req, res, "/api/syncly/sync/runs"));
app.get("/api/bridge/syncly/sync/events", (req, res) => bridgeGet(req, res, "/api/syncly/sync/events"));
app.get("/api/bridge/syncly/products", (req, res) => bridgeGet(req, res, "/api/syncly/products"));
app.get("/api/bridge/syncly/orders", (req, res) => bridgeGet(req, res, "/api/syncly/orders"));
app.get("/api/bridge/syncly/customers", (req, res) => bridgeGet(req, res, "/api/syncly/customers"));

app.post("/api/bridge/syncly/sync/trigger", (req, res) =>
  bridgePost(req, res, "/api/syncly/sync/trigger", req.body || {})
);

app.post("/api/bridge/syncly/sync/initial-import", async (req, res) => {
  const shop = res.locals.shopify.session.shop;
  const conn = getConnectorForShop(shop);
  if (!conn?.access_token) {
    return res.status(422).json({ success: false, error: "Connect your Syncly account first." });
  }
  const { ok, json } = await synclyBackendFetch(
    "POST",
    "/api/connectors/shopify/sync/initial-import",
    {},
    conn.access_token
  );
  return res.status(ok ? 200 : 400).json(json);
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT);
