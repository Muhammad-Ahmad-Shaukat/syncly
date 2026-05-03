import { DataTypes } from "sequelize";
import { sequelize } from "../db/db.js";

const Customer = sequelize.define("Customer", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    platform: { type: DataTypes.ENUM("shopify", "woocommerce"), allowNull: false, defaultValue: "woocommerce" },
    platform_customer_id: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true },
    first_name: { type: DataTypes.STRING, allowNull: true },
    last_name: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: true },
    source: { type: DataTypes.ENUM("backend", "woocommerce", "shopify"), allowNull: false, defaultValue: "woocommerce" },
    source_updated_at: { type: DataTypes.DATE, allowNull: true },
    last_synced_at: { type: DataTypes.DATE, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    sync_hash: { type: DataTypes.STRING, allowNull: true },
    raw_platform_data: { type: DataTypes.JSON, allowNull: true }
}, {
    tableName: "customers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { unique: true, fields: ["store_id", "platform_customer_id"], name: "uq_store_platform_customer" },
        { fields: ["store_id"] },
    ]
});

export default Customer;
