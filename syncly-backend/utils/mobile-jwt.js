import jwt from "jsonwebtoken";

const ACCESS_EXPIRES = "15m";

/**
 * @param {{ id: number, email?: string }} user
 */
export function issueMobileAccessToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    return jwt.sign(
        { sub: user.id, email: user.email, typ: "mobile_access" },
        secret,
        { expiresIn: ACCESS_EXPIRES }
    );
}
