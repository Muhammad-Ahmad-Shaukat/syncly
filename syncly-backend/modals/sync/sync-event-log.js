import { DataTypes } from "sequelize";
import { sequelize } from "../../db/db.js";

const SyncEventLog = sequelize.define("SyncEventLog", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    entity_type: { type: DataTypes.ENUM("product", "order", "customer"), allowNull: false },
    operation: { type: DataTypes.ENUM("create", "update", "delete", "bulk"), allowNull: false },
    direction: {
        type: DataTypes.ENUM(
            "woo_to_backend",
            "backend_to_woo",
            "shopify_to_backend",
            "backend_to_shopify"
        ),
        allowNull: false
    },
    origin: { type: DataTypes.ENUM("backend", "woocommerce", "shopify"), allowNull: false },
    external_id: { type: DataTypes.STRING, allowNull: true },
    idempotency_key: { type: DataTypes.STRING, allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.ENUM("queued", "processed", "failed", "ignored"), allowNull: false, defaultValue: "queued" },
    error_message: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: "sync_event_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { unique: true, fields: ["store_id", "idempotency_key"], name: "uq_store_idempotency" },
        { fields: ["store_id", "entity_type"] },
        { fields: ["status"] }
    ]
});

export default SyncEventLog;
