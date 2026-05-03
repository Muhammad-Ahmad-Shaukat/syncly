/**
 * Single provider interface: Resend first, then SendGrid-compatible REST.
 */
export async function sendMarketingEmail({ to, subject, html }) {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM || "InventSync <onboarding@resend.dev>",
                to: [to],
                subject,
                html
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data?.message || `Resend error ${res.status}`);
        }
        return { provider: "resend", id: data?.id || null };
    }

    const sgKey = process.env.SENDGRID_API_KEY;
    if (sgKey) {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${sgKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: to }] }],
                from: { email: process.env.SENDGRID_FROM_EMAIL || "noreply@example.com" },
                subject,
                content: [{ type: "text/html", value: html }]
            })
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`SendGrid error ${res.status}: ${t}`);
        }
        const msgId = res.headers.get("x-message-id");
        return { provider: "sendgrid", id: msgId };
    }

    throw new Error("No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY)");
}
