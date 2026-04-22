import { DataTypes } from "sequelize";
import { sequelize } from "../../db/db.js";

const SyncJob = sequelize.define("SyncJob", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    run_log_id: { type: DataTypes.INTEGER, allowNull: true },
    queue_type: { type: DataTypes.ENUM("ingest", "dispatch"), allowNull: false },
    entity_type: { type: DataTypes.ENUM("product", "order", "customer"), allowNull: false },
    operation: { type: DataTypes.ENUM("create", "update", "delete", "bulk"), allowNull: false, defaultValue: "bulk" },
    payload: { type: DataTypes.JSON, allowNull: false },
    idempotency_key: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM("queued", "processing", "completed", "failed"), allowNull: false, defaultValue: "queued" },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    max_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    next_attempt_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    last_error: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: "sync_jobs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { fields: ["status", "next_attempt_at"] },
        { unique: true, fields: ["store_id", "idempotency_key", "queue_type"], name: "uq_sync_job_idempotency" }
    ]
});

export default SyncJob;
