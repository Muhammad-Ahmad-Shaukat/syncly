import { DataTypes } from "sequelize";
import { sequelize } from "../../db/db.js";

const SyncRunLog = sequelize.define("SyncRunLog", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    trigger_type: { type: DataTypes.ENUM("initial", "delta", "manual_retry"), allowNull: false },
    status: { type: DataTypes.ENUM("running", "completed", "failed"), allowNull: false, defaultValue: "running" },
    started_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    finished_at: { type: DataTypes.DATE, allowNull: true },
    totals: { type: DataTypes.JSON, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: "sync_run_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["store_id", "status"] }]
});

export default SyncRunLog;
