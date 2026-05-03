import { DataTypes } from "sequelize";
import { sequelize } from "../db/db.js";

const SyncConflict = sequelize.define("SyncConflict", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    sku: { type: DataTypes.STRING(255), allowNull: false },
    left_snapshot: { type: DataTypes.JSON, allowNull: true },
    right_snapshot: { type: DataTypes.JSON, allowNull: true },
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
