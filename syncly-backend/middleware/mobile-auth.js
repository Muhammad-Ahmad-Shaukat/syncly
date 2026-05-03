import jwt from "jsonwebtoken";

/**
 * Verifies short-lived mobile access JWT (typ: mobile_access).
 */
export function requireMobileUser(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: "Missing authorization" });
    }
    const token = header.slice(7);
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ success: false, error: "Server misconfiguration" });
        }
        const payload = jwt.verify(token, secret);
        if (payload.typ !== "mobile_access") {
            return res.status(401).json({ success: false, error: "Invalid token type" });
        }
        req.mobileUserId = Number(payload.sub);
        req.mobileEmail = payload.email || null;
        if (!req.mobileUserId) {
            return res.status(401).json({ success: false, error: "Invalid token subject" });
        }
        return next();
    } catch {
        return res.status(401).json({ success: false, error: "Invalid or expired access token" });
    }
}
