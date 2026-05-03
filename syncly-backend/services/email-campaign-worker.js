import { CampaignSend, EmailCampaign } from "../db/models.js";
import { sendMarketingEmail } from "./email-provider.js";

let handle = null;

async function processBatch() {
    const batch = await CampaignSend.findAll({
        where: { status: "queued" },
        order: [["id", "ASC"]],
        limit: 15
    });
    for (const row of batch) {
        const campaign = await EmailCampaign.findByPk(row.campaign_id);
        if (!campaign) {
            await row.update({ status: "failed", error_message: "Campaign missing" });
            continue;
        }
        try {
            const result = await sendMarketingEmail({
                to: row.recipient_email,
                subject: campaign.subject,
                html: campaign.body_html
            });
            await row.update({
                status: "sent",
                sent_at: new Date(),
                provider_message_id: result.id || null
            });
        } catch (e) {
            await row.update({
                status: "failed",
                error_message: e.message || "send failed"
            });
        }
    }
    const sending = await EmailCampaign.findAll({ where: { status: "sending" } });
    for (const c of sending) {
        const pending = await CampaignSend.count({ where: { campaign_id: c.id, status: "queued" } });
        if (pending === 0) {
            const failed = await CampaignSend.count({ where: { campaign_id: c.id, status: "failed" } });
            const sent = await CampaignSend.count({ where: { campaign_id: c.id, status: "sent" } });
            await c.update({
                status: failed > 0 ? "failed" : "sent",
                stats_json: { sent, failed }
            });
        }
    }
}

export function startEmailCampaignWorker() {
    if (handle) return;
    const intervalMs = Number(process.env.EMAIL_WORKER_INTERVAL_MS || 5000);
    handle = setInterval(() => {
        processBatch().catch((err) => console.error("[email-worker]", err.message));
    }, intervalMs);
}
