import { DataTypes } from "sequelize";
import { sequelize } from "../db/db.js";

const Order = sequelize.define("Order", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    platform: { type: DataTypes.ENUM("shopify", "woocommerce"), allowNull: false, defaultValue: "woocommerce" },
    platform_order_id: { type: DataTypes.STRING, allowNull: false },
    order_number: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: true },
    currency: { type: DataTypes.STRING(8), allowNull: true },
    total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    source: { type: DataTypes.ENUM("backend", "woocommerce", "shopify"), allowNull: false, defaultValue: "woocommerce" },
    source_updated_at: { type: DataTypes.DATE, allowNull: true },
    last_synced_at: { type: DataTypes.DATE, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    sync_hash: { type: DataTypes.STRING, allowNull: true },
    raw_platform_data: { type: DataTypes.JSON, allowNull: true }
}, {
    tableName: "orders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { unique: true, fields: ["store_id", "platform_order_id"], name: "uq_store_platform_order" },
        { fields: ["store_id"] },
    ]
});

export default Order;
