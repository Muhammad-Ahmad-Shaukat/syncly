import jwt from 'jsonwebtoken';

/** Access tokens for WooCommerce / long-lived clients (90 days). */
const USER_TOKEN_EXPIRES_IN = '90d';

/**
 * @param {{ id: number, email: string }} user — public user fields from authenticate()
 * @returns {string} JWT
 */
export function issueUserAccessToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return jwt.sign(
        { sub: user.id, email: user.email },
        secret,
        { expiresIn: USER_TOKEN_EXPIRES_IN }
    );
}
