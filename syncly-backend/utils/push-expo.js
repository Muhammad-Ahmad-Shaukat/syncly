/**
 * Sends a push via Expo Push API (works when EXPO_ACCESS_TOKEN is set for higher limits).
 */
export async function sendExpoPush({ to, title, body, data = {} }) {
    if (!to || !String(to).startsWith("ExponentPushToken")) {
        return { skipped: true };
    }
    const headers = {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json"
    };
    if (process.env.EXPO_ACCESS_TOKEN) {
        headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    }
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers,
        body: JSON.stringify({
            to,
            title,
            body,
            data,
            sound: "default"
        })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(json?.errors?.[0]?.message || `Expo push failed ${res.status}`);
    }
    return json;
}

export async function maybeNotifyLowStock({ user, previousQty, newQty, productTitle }) {
    const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 10);
    if (!user?.expo_push_token) return;
    const crossed =
        (previousQty == null || previousQty > threshold) &&
        newQty != null &&
        newQty <= threshold;
    if (!crossed) return;
    try {
        await sendExpoPush({
            to: user.expo_push_token,
            title: "Low stock",
            body: `${productTitle || "A product"} is at or below ${threshold} units.`,
            data: { type: "low_stock" }
        });
    } catch (e) {
        console.warn("[push] low stock notify failed:", e.message);
    }
}
