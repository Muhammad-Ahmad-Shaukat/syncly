import express from "express";
import {
    connectorExchange,
    connectorRefresh,
    connectorRevoke,
    dispatchCommand,
    ingestBatch,
    ingestDelta,
    initialImportShopify,
    saveShopifySession,
    syncDiagnostics
} from "../../controllers/connectors/connector-auth-controller.js";
import { verifyConnectorToken } from "../../middlewares/verify-connector-token.js";

const router = express.Router();

router.use((req, res, next) => {
    req.synclyPlatform = "shopify";
    next();
});

router.post("/auth/exchange", connectorExchange);
router.post("/auth/refresh", connectorRefresh);
router.post("/auth/revoke", connectorRevoke);

router.post("/session", verifyConnectorToken, saveShopifySession);
router.post("/sync/initial-import", verifyConnectorToken, initialImportShopify);
router.post("/sync/batch", verifyConnectorToken, ingestBatch);
router.post("/sync/delta", verifyConnectorToken, ingestDelta);
router.post("/dispatch/command", dispatchCommand);

router.get("/sync/diagnostics/:storeId", syncDiagnostics);

export default router;
