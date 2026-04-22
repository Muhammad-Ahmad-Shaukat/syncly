import express from "express";
import {
    connectorExchange,
    connectorRefresh,
    connectorRevoke,
    dispatchCommand,
    ingestBatch,
    ingestDelta,
    syncDiagnostics
} from "../../controllers/connectors/woocommerce-auth-controller.js";
import { verifyConnectorToken } from "../../middlewares/verify-connector-token.js";

const router = express.Router();

router.post("/auth/exchange", connectorExchange);
router.post("/auth/refresh", connectorRefresh);
router.post("/auth/revoke", connectorRevoke);

router.post("/sync/batch", verifyConnectorToken, ingestBatch);
router.post("/sync/delta", verifyConnectorToken, ingestDelta);
router.post("/dispatch/command", dispatchCommand);

router.get("/sync/diagnostics/:storeId", syncDiagnostics);

export default router;
