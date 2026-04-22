import { Store } from "../db/models.js";
import { verifyConnectorAccessToken } from "../utils/connector-token.js";

export async function verifyConnectorToken(req, res, next) {
    try {
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, error: "Missing bearer token" });
        }

        const token = auth.slice(7);
        const payload = verifyConnectorAccessToken(token);
        const store = await Store.findByPk(payload.storeId);

        if (!store || !store.is_active) {
            return res.status(401).json({ success: false, error: "Store is inactive or missing" });
        }
        if (store.connector_token_revoked_at) {
            return res.status(401).json({ success: false, error: "Connector token revoked" });
        }

        req.connector = {
            storeId: payload.storeId,
            userId: payload.userId,
            scope: payload.scope || [],
        };
        store.connector_last_used_at = new Date();
        await store.save();
        return next();
    } catch (error) {
        return res.status(401).json({ success: false, error: "Invalid connector token" });
    }
}

