import { DataTypes } from "sequelize";
import { sequelize } from "../../db/db.js";

const SyncMapping = sequelize.define("SyncMapping", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    entity_type: { type: DataTypes.ENUM("product", "order", "customer"), allowNull: false },
    external_id: { type: DataTypes.STRING, allowNull: false },
    internal_id: { type: DataTypes.INTEGER, allowNull: false },
    source: { type: DataTypes.ENUM("backend", "woocommerce"), allowNull: false, defaultValue: "woocommerce" },
    source_updated_at: { type: DataTypes.DATE, allowNull: true },
    last_synced_at: { type: DataTypes.DATE, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
}, {
    tableName: "sync_mappings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { unique: true, fields: ["store_id", "entity_type", "external_id"], name: "uq_store_entity_external" },
        { fields: ["store_id", "entity_type", "internal_id"] }
    ]
});

export default SyncMapping;
