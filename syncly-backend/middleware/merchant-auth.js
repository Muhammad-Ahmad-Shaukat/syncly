import jwt from "jsonwebtoken";
import { verifyConnectorAccessToken } from "../utils/connector-token.js";

/**
 * Mobile JWT (typ: mobile_access) or connector JWT (Shopify/Woo) → req.mobileUserId.
 */
export function requireMerchantAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: "Missing authorization." });
    }
    const token = header.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ success: false, error: "Server misconfiguration" });
    }

    try {
        const payload = jwt.verify(token, secret);
        if (payload.typ === "mobile_access" && payload.sub) {
            req.mobileUserId = Number(payload.sub);
            req.authKind = "mobile";
            return next();
        }
    } catch {
        // Not a mobile JWT with primary secret
    }

    try {
        const cp = verifyConnectorAccessToken(token);
        if (cp.userId != null) {
            req.mobileUserId = Number(cp.userId);
            req.connectorStoreId = cp.storeId != null ? Number(cp.storeId) : null;
            req.authKind = "connector";
            return next();
        }
    } catch {
        // Invalid connector token
    }

    return res.status(401).json({ success: false, error: "Invalid or expired token." });
}
