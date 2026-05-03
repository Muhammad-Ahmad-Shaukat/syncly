import { DataTypes } from "sequelize";
import { sequelize } from "../db/db.js";

/** Narrow MVP: normalized threads (Shopify messages / Woo notes represented as source + external ref). */
export const ConversationThread = sequelize.define("ConversationThread", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    source: {
        type: DataTypes.ENUM("shopify_messages", "woo_order_notes", "manual"),
        allowNull: false,
        defaultValue: "manual"
    },
    external_ref: { type: DataTypes.STRING(255), allowNull: true }
}, {
    tableName: "conversation_threads",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["user_id"] }]
});

export const ConversationMessage = sequelize.define("ConversationMessage", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    thread_id: { type: DataTypes.INTEGER, allowNull: false },
    direction: { type: DataTypes.ENUM("in", "out"), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    metadata_json: { type: DataTypes.JSON, allowNull: true }
}, {
    tableName: "conversation_messages",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["thread_id"] }]
});

ConversationThread.hasMany(ConversationMessage, { foreignKey: "thread_id", onDelete: "CASCADE" });
ConversationMessage.belongsTo(ConversationThread, { foreignKey: "thread_id" });
