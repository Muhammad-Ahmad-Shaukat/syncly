import { DataTypes } from "sequelize";
import { sequelize } from "../db/db.js";

export const EmailTemplate = sequelize.define("EmailTemplate", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(160), allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    body_html: { type: DataTypes.TEXT, allowNull: false }
}, {
    tableName: "email_templates",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
});

export const EmailSegment = sequelize.define("EmailSegment", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(160), allowNull: false },
    rules_json: { type: DataTypes.JSON, allowNull: false, defaultValue: { platform: "all" } }
}, {
    tableName: "email_segments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
});

export const EmailCampaign = sequelize.define("EmailCampaign", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(160), allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    body_html: { type: DataTypes.TEXT, allowNull: false },
    email_template_id: { type: DataTypes.INTEGER, allowNull: true },
    email_segment_id: { type: DataTypes.INTEGER, allowNull: true },
    status: {
        type: DataTypes.ENUM("draft", "scheduled", "sending", "sent", "failed"),
        allowNull: false,
        defaultValue: "draft"
    },
    scheduled_at: { type: DataTypes.DATE, allowNull: true },
    stats_json: { type: DataTypes.JSON, allowNull: true }
}, {
    tableName: "email_campaigns",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
});

export const CampaignSend = sequelize.define("CampaignSend", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    campaign_id: { type: DataTypes.INTEGER, allowNull: false },
    recipient_email: { type: DataTypes.STRING(255), allowNull: false },
    status: {
        type: DataTypes.ENUM("queued", "sent", "failed"),
        allowNull: false,
        defaultValue: "queued"
    },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    provider_message_id: { type: DataTypes.STRING(255), allowNull: true }
}, {
    tableName: "campaign_sends",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["campaign_id", "status"] }]
});

EmailCampaign.hasMany(CampaignSend, { foreignKey: "campaign_id", onDelete: "CASCADE" });
CampaignSend.belongsTo(EmailCampaign, { foreignKey: "campaign_id" });
