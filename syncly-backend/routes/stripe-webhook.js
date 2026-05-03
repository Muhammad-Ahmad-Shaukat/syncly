import express from "express";
import { User } from "../db/models.js";

const router = express.Router();

function tierFromPriceId(priceId) {
    if (!priceId) return null;
    if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
    if (priceId === process.env.STRIPE_PRICE_EXTREME) return "extreme";
    if (priceId === process.env.STRIPE_PRICE_BASIC) return "basic";
    return null;
}

router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeKey || !whSecret) {
        return res.status(503).send("Stripe webhook not configured");
    }
    let Stripe;
    try {
        ({ default: Stripe } = await import("stripe"));
    } catch {
        return res.status(503).send("Stripe SDK not installed");
    }
    const stripe = new Stripe(stripeKey);
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
    } catch (err) {
        return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const userId = Number(session.metadata?.user_id || session.client_reference_id);
            const tierFromMeta = session.metadata?.tierType;
            if (userId) {
                const user = await User.findByPk(userId);
                if (user) {
                    const subId = typeof session.subscription === "string"
                        ? session.subscription
                        : session.subscription?.id;
                    await user.update({
                        stripe_subscription_id: subId || user.stripe_subscription_id,
                        subscription_status: "active",
                        tierType: ["basic", "pro", "extreme"].includes(tierFromMeta)
                            ? tierFromMeta
                            : user.tierType
                    });
                }
            }
        }
        if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
            const sub = event.data.object;
            const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
            const user = await User.findOne({ where: { stripe_customer_id: customerId } });
            if (user) {
                const priceId = sub.items?.data?.[0]?.price?.id;
                const tier = tierFromPriceId(priceId);
                const status = sub.status === "active" ? "active" : sub.status || "none";
                await user.update({
                    stripe_subscription_id: sub.id,
                    subscription_status: status,
                    ...(tier ? { tierType: tier } : {})
                });
            }
        }
    } catch (e) {
        console.error("[stripe-webhook]", e.message);
        return res.status(500).json({ received: false, error: e.message });
    }
    res.json({ received: true });
});

export default router;
