import { DataTypes } from "sequelize";
import { sequelize } from "../db/db.js";

const SyncConflict = sequelize.define("SyncConflict", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    sku: { type: DataTypes.STRING(255), allowNull: false },
    conflict_kind: {
        type: DataTypes.ENUM("duplicate_sku", "field_mismatch"),
        allowNull: false,
        defaultValue: "duplicate_sku"
    },
    field_key: { type: DataTypes.STRING(64), allowNull: true },
    syncly_public_id: { type: DataTypes.STRING(32), allowNull: true },
    left_snapshot: { type: DataTypes.JSON, allowNull: true },
    right_snapshot: { type: DataTypes.JSON, allowNull: true },
    left_platform: { type: DataTypes.STRING(32), allowNull: true },
    right_platform: { type: DataTypes.STRING(32), allowNull: true },
    status: { type: DataTypes.ENUM("open", "resolved"), allowNull: false, defaultValue: "open" },
    resolution: { type: DataTypes.JSON, allowNull: true }
}, {
    tableName: "sync_conflicts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["user_id", "status"] }]
});

export default SyncConflict;
