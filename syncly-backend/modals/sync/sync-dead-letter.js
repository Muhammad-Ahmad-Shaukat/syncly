import { DataTypes } from "sequelize";
import { sequelize } from "../../db/db.js";

const SyncDeadLetter = sequelize.define("SyncDeadLetter", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    job_id: { type: DataTypes.INTEGER, allowNull: false },
    queue_type: { type: DataTypes.ENUM("ingest", "dispatch"), allowNull: false },
    entity_type: { type: DataTypes.ENUM("product", "order", "customer"), allowNull: false },
    idempotency_key: { type: DataTypes.STRING, allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: false },
    error_message: { type: DataTypes.TEXT, allowNull: false }
}, {
    tableName: "sync_dead_letters",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["store_id", "queue_type", "entity_type"] }]
});

export default SyncDeadLetter;
