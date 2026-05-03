import crypto from "crypto";

export function hashRefreshToken(plain) {
    return crypto.createHash("sha256").update(String(plain), "utf8").digest("hex");
}

export function generateRefreshToken() {
    return crypto.randomBytes(48).toString("hex");
}
