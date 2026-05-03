import express from "express";
import { requireMobileUser } from "../middleware/mobile-auth.js";
import { User } from "../db/models.js";

const router = express.Router();

async function getStripeClient() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    try {
        const { default: Stripe } = await import("stripe");
        return new Stripe(key);
    } catch {
        return null;
    }
}

function priceIdForTier(tierType) {
    if (tierType === "pro") return process.env.STRIPE_PRICE_PRO;
    if (tierType === "extreme") return process.env.STRIPE_PRICE_EXTREME;
    return process.env.STRIPE_PRICE_BASIC;
}

router.post("/checkout-session", requireMobileUser, async (req, res) => {
    const stripe = await getStripeClient();
    if (!stripe) {
        return res.status(503).json({
            success: false,
            error: "Stripe is not configured or the stripe package failed to load."
        });
    }
    const tierType = req.body?.tierType || "basic";
    if (!["basic", "pro", "extreme"].includes(tierType)) {
        return res.status(400).json({ success: false, error: "Invalid tierType" });
    }
    const priceId = priceIdForTier(tierType);
    if (!priceId) {
        return res.status(503).json({ success: false, error: "Missing STRIPE_PRICE_* env for tier" });
    }
    const user = await User.findByPk(req.mobileUserId);
    let customerId = user.stripe_customer_id;
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: user.email,
            metadata: { inventsync_user_id: String(user.id) }
        });
        customerId = customer.id;
        await user.update({ stripe_customer_id: customerId });
    }
    const successUrl = process.env.STRIPE_SUCCESS_URL || "http://127.0.0.1:19006/";
    const cancelUrl = process.env.STRIPE_CANCEL_URL || "http://127.0.0.1:19006/";
    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: { user_id: String(user.id), tierType }
    });
    res.json({ success: true, url: session.url, sessionId: session.id });
});

router.post("/portal-session", requireMobileUser, async (req, res) => {
    const stripe = await getStripeClient();
    if (!stripe) {
        return res.status(503).json({
            success: false,
            error: "Stripe is not configured or the stripe package failed to load."
        });
    }
    const user = await User.findByPk(req.mobileUserId);
    if (!user.stripe_customer_id) {
        return res.status(400).json({ success: false, error: "No billing customer on file" });
    }
    const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL || "http://127.0.0.1:19006/";
    const session = await stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: returnUrl
    });
    res.json({ success: true, url: session.url });
});

export default router;
