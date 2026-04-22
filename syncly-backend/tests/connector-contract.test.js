import assert from "node:assert/strict";
import { issueConnectorAccessToken, verifyConnectorAccessToken, issueRefreshToken } from "../utils/connector-token.js";

process.env.CONNECTOR_JWT_SECRET = process.env.CONNECTOR_JWT_SECRET || "test-secret";

const token = issueConnectorAccessToken({ storeId: 42, userId: 7, scope: ["sync:write"] });
const payload = verifyConnectorAccessToken(token);

assert.equal(payload.storeId, 42, "storeId should roundtrip through connector token");
assert.equal(payload.userId, 7, "userId should roundtrip through connector token");
assert.ok(Array.isArray(payload.scope), "scope should be an array");

const refreshToken = issueRefreshToken();
assert.equal(typeof refreshToken, "string", "refresh token should be string");
assert.ok(refreshToken.length >= 32, "refresh token should be long enough");

console.log("connector-contract.test passed");

