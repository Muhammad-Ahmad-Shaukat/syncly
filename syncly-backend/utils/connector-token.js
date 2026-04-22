import crypto from "crypto";
import jwt from "jsonwebtoken";

const ACCESS_EXPIRES_SECONDS = Number(process.env.CONNECTOR_ACCESS_TTL_SECONDS || 3600);
const REFRESH_EXPIRES_SECONDS = Number(process.env.CONNECTOR_REFRESH_TTL_SECONDS || 60 * 60 * 24 * 30);

export function issueConnectorAccessToken(payload) {
    const secret = process.env.CONNECTOR_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("CONNECTOR_JWT_SECRET is not configured");
    }
    return jwt.sign(payload, secret, { expiresIn: ACCESS_EXPIRES_SECONDS });
}

export function verifyConnectorAccessToken(token) {
    const secret = process.env.CONNECTOR_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("CONNECTOR_JWT_SECRET is not configured");
    }
    return jwt.verify(token, secret);
}

export function issueRefreshToken() {
    return crypto.randomBytes(48).toString("hex");
}

export function connectorTokenExpiry() {
    return new Date(Date.now() + ACCESS_EXPIRES_SECONDS * 1000);
}

export function refreshTokenExpiry() {
    return new Date(Date.now() + REFRESH_EXPIRES_SECONDS * 1000);
}

export function createWebhookSecret() {
    return crypto.randomBytes(32).toString("hex");
}

